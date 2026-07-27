import mongoose, { Document } from 'mongoose';
export interface ISystemCheckDocument extends Document {
    _id: mongoose.Types.ObjectId;
    status: string;
    checkedAt: Date;
}
export declare const SystemCheckModel: mongoose.Model<any, {}, {}, {}, any, any>;
export type SystemCheck = {
    id: string;
    status: string;
    checkedAt: Date;
};
//# sourceMappingURL=schema.d.ts.map