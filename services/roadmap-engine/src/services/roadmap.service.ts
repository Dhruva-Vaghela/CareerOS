import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import {
  RoadmapStatus,
  NodeType,
  EnrichedRoadmap,
  EnrichedModule,
  EnrichedTopic,
  EnrichedSubtopic,
  RoadmapGeneratedEvent,
  RoadmapNodeCompletedEvent,
} from '@careeros/shared-types';
import { NotFoundError, BadRequestError, ForbiddenError } from '@careeros/errors';
import { createLogger } from '@careeros/logger';
import { RoadmapModel, IRoadmapDoc } from '../db/models/roadmap.model.js';
import { ModuleModel } from '../db/models/module.model.js';
import { TopicModel } from '../db/models/topic.model.js';
import { SubtopicModel } from '../db/models/subtopic.model.js';
import { ChecklistItemModel } from '../db/models/checklistItem.model.js';
import { DependencyLinkModel } from '../db/models/dependencyLink.model.js';
import { AIGeneratorService } from './aiGenerator.service.js';
import { getEventBus } from '../bus.js';

const logger = createLogger('roadmap-service');

export interface GenerateRoadmapOptions {
  userId: string;
  goalId?: string;
  targetRole?: string;
  targetCompanies?: string[];
  targetTimeline?: string;
  experienceLevel?: string;
  currentSkills?: string[];
}

export class RoadmapService {
  private aiGenerator: AIGeneratorService;

  constructor() {
    this.aiGenerator = new AIGeneratorService();
  }

  public async generateRoadmap(options: GenerateRoadmapOptions): Promise<EnrichedRoadmap> {
    const { userId } = options;
    const targetRole = options.targetRole || 'Full Stack Developer';
    const goalId = options.goalId || randomUUID();

    logger.info({ userId, targetRole }, 'Generating personalized learning roadmap');

    // 1. Call AI generator
    const generated = await this.aiGenerator.generateRoadmap({
      userId,
      targetRole,
      targetCompanies: options.targetCompanies,
      targetTimeline: options.targetTimeline,
      experienceLevel: options.experienceLevel,
      currentSkills: options.currentSkills,
    });

    // 2. Archive previous active roadmaps for this user
    await RoadmapModel.updateMany(
      { userId, status: RoadmapStatus.ACTIVE },
      { $set: { status: RoadmapStatus.ARCHIVED } },
    );

    // 3. Count prior versions
    const priorCount = await RoadmapModel.countDocuments({ userId });
    const version = priorCount + 1;

    // 4. Save new Roadmap document
    const roadmap = await RoadmapModel.create({
      userId,
      goalId,
      targetRole: generated.targetRole,
      status: RoadmapStatus.ACTIVE,
      version,
      modulesCount: generated.modules.length,
      totalItemsCount: 0,
      completedItemsCount: 0,
      generatedAt: new Date(),
    });

    let totalItemsCount = 0;
    const moduleDocs = [];

    // 5. Save hierarchical nodes
    for (let mIdx = 0; mIdx < generated.modules.length; mIdx++) {
      const genMod = generated.modules[mIdx];
      const modDoc = await ModuleModel.create({
        roadmapId: roadmap._id,
        order: mIdx + 1,
        title: genMod.title,
        description: genMod.description,
        type: genMod.type || NodeType.MANDATORY,
        estimatedHours: genMod.estimatedHours || 15,
      });

      // Track dependency link from previous mandatory module to current
      if (mIdx > 0) {
        await DependencyLinkModel.create({
          roadmapId: roadmap._id,
          fromNodeId: moduleDocs[mIdx - 1]._id.toString(),
          toNodeId: modDoc._id.toString(),
          type: 'PREREQUISITE',
        });
      }
      moduleDocs.push(modDoc);

      for (let tIdx = 0; tIdx < genMod.topics.length; tIdx++) {
        const genTop = genMod.topics[tIdx];
        const topDoc = await TopicModel.create({
          moduleId: modDoc._id,
          roadmapId: roadmap._id,
          order: tIdx + 1,
          title: genTop.title,
          description: genTop.description,
          type: genTop.type || modDoc.type,
        });

        for (let sIdx = 0; sIdx < genTop.subtopics.length; sIdx++) {
          const genSub = genTop.subtopics[sIdx];
          const subDoc = await SubtopicModel.create({
            topicId: topDoc._id,
            moduleId: modDoc._id,
            roadmapId: roadmap._id,
            order: sIdx + 1,
            title: genSub.title,
            type: genSub.type || topDoc.type,
          });

          for (let cIdx = 0; cIdx < genSub.checklistItems.length; cIdx++) {
            const genCheck = genSub.checklistItems[cIdx];
            await ChecklistItemModel.create({
              subtopicId: subDoc._id,
              topicId: topDoc._id,
              moduleId: modDoc._id,
              roadmapId: roadmap._id,
              userId,
              order: cIdx + 1,
              title: genCheck.title,
              description: genCheck.description,
              completed: false,
              resourceRef: genCheck.resourceTitle
                ? {
                    title: genCheck.resourceTitle,
                    url: genCheck.resourceUrl || '',
                    type: genCheck.resourceType || 'DOCUMENTATION',
                  }
                : undefined,
            });
            totalItemsCount++;
          }
        }
      }
    }

    // 6. Update counts on roadmap doc
    roadmap.totalItemsCount = totalItemsCount;
    await roadmap.save();

    // 7. Publish roadmap.generated event
    const eventBus = getEventBus();
    const event: RoadmapGeneratedEvent = {
      name: 'roadmap.generated',
      metadata: {
        eventId: randomUUID(),
        timestamp: new Date().toISOString(),
        traceId: randomUUID(),
        userId,
      },
      payload: {
        userId,
        roadmapId: roadmap._id.toString(),
        goalId,
        modulesCount: generated.modules.length,
      },
    };
    await eventBus.publish(event);

    logger.info(
      { userId, roadmapId: roadmap._id.toString(), totalItemsCount },
      'Successfully persisted roadmap and dispatched roadmap.generated event',
    );

    return this.assembleEnrichedRoadmap(roadmap);
  }

  public async getActiveRoadmap(userId: string): Promise<EnrichedRoadmap | null> {
    const roadmap = await RoadmapModel.findOne({ userId, status: RoadmapStatus.ACTIVE });
    if (!roadmap) {
      return null;
    }
    return this.assembleEnrichedRoadmap(roadmap);
  }

  public async getRoadmapById(userId: string, roadmapId: string): Promise<EnrichedRoadmap> {
    const roadmap = await RoadmapModel.findById(roadmapId);
    if (!roadmap) {
      throw new NotFoundError(`Roadmap with id ${roadmapId} not found`);
    }
    if (roadmap.userId !== userId) {
      throw new ForbiddenError('You do not have permission to view this roadmap');
    }
    return this.assembleEnrichedRoadmap(roadmap);
  }

  public async getRoadmapHistory(userId: string) {
    return RoadmapModel.find({ userId }).sort({ generatedAt: -1 }).lean();
  }

  public async toggleChecklistItem(
    userId: string,
    roadmapId: string,
    itemId: string,
    completedValue?: boolean,
  ) {
    const item = await ChecklistItemModel.findOne({ _id: itemId, roadmapId, userId });
    if (!item) {
      throw new NotFoundError(`Checklist item with id ${itemId} not found on this roadmap`);
    }

    const nextCompleted = completedValue !== undefined ? completedValue : !item.completed;
    item.completed = nextCompleted;
    item.completedAt = nextCompleted ? new Date() : undefined;
    await item.save();

    // Recalculate completed count
    const completedCount = await ChecklistItemModel.countDocuments({
      roadmapId: new mongoose.Types.ObjectId(roadmapId),
      completed: true,
    });

    const totalCount = await ChecklistItemModel.countDocuments({
      roadmapId: new mongoose.Types.ObjectId(roadmapId),
    });

    await RoadmapModel.findByIdAndUpdate(roadmapId, {
      completedItemsCount: completedCount,
      totalItemsCount: totalCount,
    });

    // Publish roadmap.node.completed event
    if (nextCompleted) {
      const eventBus = getEventBus();
      const event: RoadmapNodeCompletedEvent = {
        name: 'roadmap.node.completed',
        metadata: {
          eventId: randomUUID(),
          timestamp: new Date().toISOString(),
          traceId: randomUUID(),
          userId,
        },
        payload: {
          userId,
          roadmapId,
          nodeType: 'CHECKLIST',
          nodeId: itemId,
        },
      };
      await eventBus.publish(event);
    }

    return {
      item,
      completedItemsCount: completedCount,
      totalItemsCount: totalCount,
      progressPercentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    };
  }

  public async updateNode(
    userId: string,
    roadmapId: string,
    nodeId: string,
    nodeType: 'MODULE' | 'TOPIC',
    updates: { title?: string; isDeleted?: boolean },
  ) {
    const roadmap = await RoadmapModel.findById(roadmapId);
    if (!roadmap) {
      throw new NotFoundError('Roadmap not found');
    }
    if (roadmap.userId !== userId) {
      throw new ForbiddenError('Unauthorized roadmap mutation');
    }

    if (nodeType === 'MODULE') {
      const mod = await ModuleModel.findOne({ _id: nodeId, roadmapId });
      if (!mod) {
        throw new NotFoundError('Module not found');
      }

      // CRITICAL ARCHITECTURE INVARIANT: Mandatory nodes cannot be removed
      if (updates.isDeleted && mod.type === NodeType.MANDATORY) {
        throw new BadRequestError(
          'MANDATORY_NODE_PROTECTED: Mandatory modules cannot be removed from the curriculum.',
          { code: 'MANDATORY_NODE_PROTECTED', nodeId, nodeType },
        );
      }

      if (updates.isDeleted) {
        await ModuleModel.deleteOne({ _id: nodeId });
        await TopicModel.deleteMany({ moduleId: nodeId });
        await SubtopicModel.deleteMany({ moduleId: nodeId });
        await ChecklistItemModel.deleteMany({ moduleId: nodeId });
        return { success: true, deleted: true, nodeId };
      }

      if (updates.title) {
        mod.title = updates.title;
        await mod.save();
      }
      return { success: true, module: mod };
    }

    if (nodeType === 'TOPIC') {
      const top = await TopicModel.findOne({ _id: nodeId, roadmapId });
      if (!top) {
        throw new NotFoundError('Topic not found');
      }

      // CRITICAL ARCHITECTURE INVARIANT: Mandatory topics cannot be removed
      if (updates.isDeleted && top.type === NodeType.MANDATORY) {
        throw new BadRequestError(
          'MANDATORY_NODE_PROTECTED: Mandatory topics cannot be removed from the curriculum.',
          { code: 'MANDATORY_NODE_PROTECTED', nodeId, nodeType },
        );
      }

      if (updates.isDeleted) {
        await TopicModel.deleteOne({ _id: nodeId });
        await SubtopicModel.deleteMany({ topicId: nodeId });
        await ChecklistItemModel.deleteMany({ topicId: nodeId });
        return { success: true, deleted: true, nodeId };
      }

      if (updates.title) {
        top.title = updates.title;
        await top.save();
      }
      return { success: true, topic: top };
    }

    throw new BadRequestError('Invalid nodeType provided');
  }

  private async assembleEnrichedRoadmap(roadmap: IRoadmapDoc): Promise<EnrichedRoadmap> {
    const roadmapId = roadmap._id;

    const [modules, topics, subtopics, checklistItems] = await Promise.all([
      ModuleModel.find({ roadmapId }).sort({ order: 1 }).lean(),
      TopicModel.find({ roadmapId }).sort({ order: 1 }).lean(),
      SubtopicModel.find({ roadmapId }).sort({ order: 1 }).lean(),
      ChecklistItemModel.find({ roadmapId }).sort({ order: 1 }).lean(),
    ]);

    // Map items to subtopics
    const checklistBySubtopic = new Map<string, typeof checklistItems>();
    for (const item of checklistItems) {
      const key = item.subtopicId.toString();
      if (!checklistBySubtopic.has(key)) {
        checklistBySubtopic.set(key, []);
      }
      checklistBySubtopic.get(key)!.push(item);
    }

    // Map subtopics to topics
    const subtopicsByTopic = new Map<string, EnrichedSubtopic[]>();
    for (const sub of subtopics) {
      const key = sub.topicId.toString();
      if (!subtopicsByTopic.has(key)) {
        subtopicsByTopic.set(key, []);
      }
      const items = checklistBySubtopic.get(sub._id.toString()) || [];
      subtopicsByTopic.get(key)!.push({
        id: sub._id.toString(),
        topicId: sub.topicId.toString(),
        roadmapId: sub.roadmapId.toString(),
        order: sub.order,
        title: sub.title,
        type: sub.type,
        checklist: items.map((i) => ({
          id: i._id.toString(),
          subtopicId: i.subtopicId.toString(),
          topicId: i.topicId.toString(),
          moduleId: i.moduleId.toString(),
          roadmapId: i.roadmapId.toString(),
          order: i.order,
          title: i.title,
          description: i.description,
          completed: i.completed,
          completedAt: i.completedAt,
          resourceRef: i.resourceRef ? JSON.stringify(i.resourceRef) : undefined,
          userNote: i.userNote,
          deadline: i.deadline,
        })),
      });
    }

    // Map topics to modules
    const topicsByModule = new Map<string, EnrichedTopic[]>();
    for (const top of topics) {
      const key = top.moduleId.toString();
      if (!topicsByModule.has(key)) {
        topicsByModule.set(key, []);
      }
      const enrichedSubs = subtopicsByTopic.get(top._id.toString()) || [];
      topicsByModule.get(key)!.push({
        id: top._id.toString(),
        moduleId: top.moduleId.toString(),
        roadmapId: top.roadmapId.toString(),
        order: top.order,
        title: top.title,
        description: top.description,
        type: top.type,
        subtopics: enrichedSubs,
      });
    }

    const enrichedModules: EnrichedModule[] = modules.map((m) => ({
      id: m._id.toString(),
      roadmapId: m.roadmapId.toString(),
      order: m.order,
      title: m.title,
      description: m.description,
      type: m.type,
      estimatedHours: m.estimatedHours,
      topics: topicsByModule.get(m._id.toString()) || [],
    }));

    const completedItemsCount = checklistItems.filter((i) => i.completed).length;

    return {
      id: roadmap._id.toString(),
      userId: roadmap.userId,
      goalId: roadmap.goalId,
      targetRole: roadmap.targetRole,
      status: roadmap.status,
      version: roadmap.version,
      modulesCount: enrichedModules.length,
      totalItemsCount: checklistItems.length,
      completedItemsCount,
      generatedAt: roadmap.generatedAt,
      modules: enrichedModules,
    };
  }
}
