// apps/web/src/features/categories/CategoryForm.tsx
import { useForm } from 'react-hook-form';
import Button from '@/components/Button';
import Input from '@/components/Input';
import type { Category } from '@/api/categories.api';

interface CategoryFormProps {
  initialData?: Category;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}

interface CategoryFormData {
  name: string;
  description: string;
  color: string;
  icon: string;
}

const colorOptions = [
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6b7280', // Gray
];

const iconOptions = [
  'briefcase', 'home', 'shopping-cart', 'heart', 'star',
  'calendar', 'book', 'music', 'camera', 'gamepad',
  'coffee', 'car', 'plane', 'bicycle', 'trophy',
];

export default function CategoryForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading 
}: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      color: initialData?.color || '#6366f1',
      icon: initialData?.icon || '',
    },
  });

  const watchedColor = watch('color');

  const onFormSubmit = (data: CategoryFormData) => {
    onSubmit({
      ...data,
      description: data.description || undefined,
      icon: data.icon || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Name */}
      <Input
        label="Name"
        placeholder="Enter category name"
        error={errors.name?.message}
        {...register('name', { 
          required: 'Name is required',
          maxLength: {
            value: 100,
            message: 'Name must not exceed 100 characters'
          }
        })}
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          rows={3}
          placeholder="Enter category description (optional)"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          {...register('description', {
            maxLength: {
              value: 500,
              message: 'Description must not exceed 500 characters'
            }
          })}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Color
        </label>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-gray-300"
            style={{ backgroundColor: watchedColor }}
          />
          <span className="text-sm text-gray-600">{watchedColor}</span>
        </div>
        
        <div className="grid grid-cols-5 gap-2">
          {colorOptions.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setValue('color', color)}
              className={`w-10 h-10 rounded-full border-2 hover:scale-110 transition-transform ${
                watchedColor === color ? 'border-gray-600' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        
        <div className="mt-3">
          <Input
            placeholder="Or enter custom color (hex)"
            value={watchedColor}
            onChange={(e) => setValue('color', e.target.value)}
            error={errors.color?.message}
            {...register('color', {
              required: 'Color is required',
              pattern: {
                value: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
                message: 'Please enter a valid hex color (e.g., #ff0000)'
              }
            })}
          />
        </div>
      </div>

      {/* Icon */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Icon (optional)
        </label>
        <select
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          {...register('icon')}
        >
          <option value="">Select an icon</option>
          {iconOptions.map((icon) => (
            <option key={icon} value={icon}>
              {icon}
            </option>
          ))}
        </select>
      </div>

      {/* Preview */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Preview
        </label>
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: watchedColor }}
          />
          <span className="text-sm font-medium text-gray-900">
            {watch('name') || 'Category Name'}
          </span>
          {watch('icon') && (
            <span className="text-xs text-gray-500">({watch('icon')})</span>
          )}
        </div>
        {watch('description') && (
          <p className="text-sm text-gray-600 mt-2 ml-7">
            {watch('description')}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          fullWidth
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
          fullWidth
        >
          {initialData ? 'Update' : 'Create'} Category
        </Button>
      </div>
    </form>
  );
}