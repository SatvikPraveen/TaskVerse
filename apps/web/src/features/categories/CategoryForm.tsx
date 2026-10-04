// apps/web/src/features/categories/CategoryForm.tsx
import { useForm } from 'react-hook-form';
import { CATEGORY_COLORS, type Category, type CreateCategoryInput } from '@taskverse/types';

import Button from '@/components/Button';
import Input from '@/components/Input';

interface CategoryFormProps {
  initialData?: Category;
  onSubmit: (data: CreateCategoryInput) => void;
  onCancel: () => void;
  isLoading: boolean;
}

interface CategoryFormData {
  name: string;
  description: string;
  color: string;
  icon: string;
}

const iconOptions = [
  'briefcase',
  'home',
  'shopping-cart',
  'heart',
  'star',
  'calendar',
  'book',
  'music',
  'camera',
  'coffee',
  'car',
  'plane',
  'trophy',
];

const HEX_COLOR = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export default function CategoryForm({ initialData, onSubmit, onCancel, isLoading }: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      color: initialData?.color ?? CATEGORY_COLORS[0],
      icon: initialData?.icon ?? '',
    },
  });

  const watchedColor = watch('color');
  const watchedName = watch('name');

  const onFormSubmit = (data: CategoryFormData) => {
    onSubmit({
      name: data.name,
      color: data.color,
      description: data.description || undefined,
      icon: data.icon || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <Input
        label="Name"
        placeholder="Enter category name"
        error={errors.name?.message}
        {...register('name', {
          required: 'Name is required',
          maxLength: { value: 100, message: 'Name must not exceed 100 characters' },
        })}
      />

      <div>
        <label htmlFor="category-description" className="mb-2 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="category-description"
          rows={3}
          placeholder="Optional description"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          {...register('description', {
            maxLength: { value: 500, message: 'Description must not exceed 500 characters' },
          })}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-gray-700">Colour</span>
        <div className="mb-3 grid grid-cols-5 gap-2">
          {CATEGORY_COLORS.map(color => (
            <button
              key={color}
              type="button"
              aria-label={`Use colour ${color}`}
              aria-pressed={watchedColor === color}
              onClick={() => setValue('color', color, { shouldValidate: true })}
              className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-110 ${
                watchedColor === color ? 'border-gray-700' : 'border-gray-200'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <Input
          label="Custom hex colour"
          placeholder="#ff0000"
          error={errors.color?.message}
          {...register('color', {
            required: 'Colour is required',
            pattern: { value: HEX_COLOR, message: 'Enter a valid hex colour such as #ff0000' },
          })}
        />
      </div>

      <div>
        <label htmlFor="category-icon" className="mb-2 block text-sm font-medium text-gray-700">
          Icon (optional)
        </label>
        <select
          id="category-icon"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          {...register('icon')}
        >
          <option value="">No icon</option>
          {iconOptions.map(icon => (
            <option key={icon} value={icon}>
              {icon}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg bg-gray-50 p-4">
        <span className="mb-2 block text-sm font-medium text-gray-700">Preview</span>
        <div className="flex items-center gap-3">
          <span
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: HEX_COLOR.test(watchedColor) ? watchedColor : '#d1d5db' }}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-gray-900">{watchedName || 'Category name'}</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} fullWidth>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading} fullWidth>
          {initialData ? 'Save changes' : 'Create category'}
        </Button>
      </div>
    </form>
  );
}
