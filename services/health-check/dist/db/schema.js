import mongoose, { Schema } from 'mongoose';
const systemCheckSchema = new Schema({
    status: { type: String, required: true },
    checkedAt: { type: Date, default: Date.now },
}, {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
systemCheckSchema.virtual('id').get(function () {
    return this._id.toHexString();
});
export const SystemCheckModel = mongoose.models.SystemCheck || mongoose.model('SystemCheck', systemCheckSchema, 'system_checks');
//# sourceMappingURL=schema.js.map