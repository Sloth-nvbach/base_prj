/**
 * Course/Class/Enrollment hierarchy for Sprint 4.
 * DSE-56: Design Course/Class/Enrollment Data Models
 * DSE-49: Course CRUD
 * DSE-50: Class CRUD + Student Enrollment
 */
import mongoose, { Schema, Types } from 'mongoose';

/** Course lifecycle status. */
export const COURSE_STATUSES = ['draft', 'published', 'archived'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

/** Class lifecycle status. */
export const CLASS_STATUSES = ['planned', 'active', 'completed', 'archived'] as const;
export type ClassStatus = (typeof CLASS_STATUSES)[number];

/** Enrollment role within a class. */
export const ENROLLMENT_ROLES = ['student', 'ta'] as const;
export type EnrollmentRole = (typeof ENROLLMENT_ROLES)[number];

/** Enrollment status. */
export const ENROLLMENT_STATUSES = ['active', 'dropped', 'completed'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export interface CourseDocument extends mongoose.Document {
  title: string;
  description: string;
  thumbnailUrl?: string;
  thumbnailPublicId?: string;
  createdBy: Types.ObjectId;
  status: CourseStatus;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<CourseDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 5000 },
    thumbnailUrl: { type: String },
    thumbnailPublicId: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: COURSE_STATUSES, default: 'draft' }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for query patterns
courseSchema.index({ createdBy: 1, createdAt: -1 });
courseSchema.index({ status: 1, createdAt: -1 });

export const CourseModel = mongoose.model<CourseDocument>('Course', courseSchema);


export interface ClassDocument extends mongoose.Document {
  courseId: Types.ObjectId;
  teacherId: Types.ObjectId;
  name: string;
  schedule: string;
  enrollCode: string;
  maxStudents: number;
  status: ClassStatus;
  createdAt: Date;
  updatedAt: Date;
}

const classSchema = new Schema<ClassDocument>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    schedule: { type: String, default: '', maxlength: 500 },
    enrollCode: { type: String, required: true, trim: true, uppercase: true, minlength: 6, maxlength: 12 },
    maxStudents: { type: Number, required: true, default: 50, min: 1, max: 500 },
    status: { type: String, enum: CLASS_STATUSES, default: 'planned' }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for query patterns
classSchema.index({ courseId: 1, teacherId: 1, status: 1 });
classSchema.index({ teacherId: 1, createdAt: -1 });
classSchema.index({ enrollCode: 1 }, { unique: true });

export const ClassModel = mongoose.model<ClassDocument>('Class', classSchema);


export interface EnrollmentDocument extends mongoose.Document {
  studentId: Types.ObjectId;
  classId: Types.ObjectId;
  role: EnrollmentRole;
  status: EnrollmentStatus;
  enrolledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<EnrollmentDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    role: { type: String, enum: ENROLLMENT_ROLES, default: 'student' },
    status: { type: String, enum: ENROLLMENT_STATUSES, default: 'active' },
    enrolledAt: { type: Date, required: true, default: () => new Date() }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        const r = ret as { studentId: { toString: () => string }; classId: { toString: () => string } };
        ret.studentId = r.studentId.toString();
        ret.classId = r.classId.toString();
        return ret;
      }
    }
  }
);

// Indexes for query patterns
enrollmentSchema.index({ studentId: 1, classId: 1 }, { unique: true });
enrollmentSchema.index({ classId: 1, status: 1 });
enrollmentSchema.index({ studentId: 1, status: 1 });

export const EnrollmentModel = mongoose.model<EnrollmentDocument>('Enrollment', enrollmentSchema);