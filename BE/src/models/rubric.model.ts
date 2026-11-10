/**
 * Rubric model for assignment grading.
 * DSE-51: Rubric Data Model & CRUD
 * DSE-52: Teacher defines Rubric per Exercise
 */
import mongoose, { Schema, Types } from 'mongoose';

/** Individual criterion within a rubric. */
export interface CriterionDocument extends mongoose.Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  weight: number; // 0-100, sum of all weights = 100
  maxScore: number; // 1-100
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const criterionSchema = new Schema<CriterionDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 1000 },
    weight: { type: Number, required: true, min: 0, max: 100 },
    maxScore: { type: Number, required: true, min: 1, max: 100 },
    order: { type: Number, required: true, min: 0 }
  },
  {
    timestamps: true,
    _id: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

export interface RubricDocument extends mongoose.Document {
  assignmentId: Types.ObjectId;
  criteria: CriterionDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const rubricSchema = new Schema<RubricDocument>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    criteria: { type: [criterionSchema], default: [], validate: {
      validator: function(v: CriterionDocument[]) {
        return v.length > 0;
      },
      message: 'At least one criterion is required'
    }}
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        const r = ret as { assignmentId: { toString: () => string } };
        ret.assignmentId = r.assignmentId.toString();
        return ret;
      }
    }
  }
);

// Index for query pattern (unique index defined here, not on field)
rubricSchema.index({ assignmentId: 1 }, { unique: true });

/**
 * Validates that criteria weights sum to 100.
 * Normalizes weights proportionally if they don't sum to 100 but are valid.
 */
function validateWeights(criteria: CriterionDocument[]): void {
  if (criteria.length === 0) return;

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  if (totalWeight === 0) {
    throw new Error('At least one criterion must have weight > 0');
  }

  if (totalWeight !== 100) {
    // Auto-normalize weights to sum to 100
    for (const criterion of criteria) {
      criterion.weight = Math.round((criterion.weight / totalWeight) * 100 * 100) / 100; // 2 decimal places
    }

    // Fix rounding errors by adjusting the last criterion
    const normalizedTotal = criteria.reduce((sum, c) => sum + c.weight, 0);
    const diff = 100 - normalizedTotal;
    if (Math.abs(diff) > 0.01 && criteria.length > 0) {
      criteria[criteria.length - 1].weight += diff;
    }
  }
}

// Use pre-save hook for weight validation (async function for Mongoose 9+)
rubricSchema.pre('save', async function () {
  validateWeights(this.criteria);
});

export const RubricModel = mongoose.model<RubricDocument>('Rubric', rubricSchema);
export { criterionSchema, validateWeights };