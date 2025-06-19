# System Configuration Guide

## Overview

The System Configuration feature allows you to manage configurable options throughout your car audio events platform. This provides a flexible way to handle dropdowns, multi-select fields, rules templates, and saved form data across different forms.

## Features

### 🎛️ Configuration Categories
- Event Categories (Bass Competition, Championship, etc.)
- Organizations/Sanctioning Bodies (IASCA, MECA, etc.) 
- Competition Seasons (2024, 2025, etc.)
- Custom categories as needed

### 📝 Form Field Configuration
- Configure which fields appear in which forms
- Set field types (select, multiselect, textarea, etc.)
- Define validation rules and help text
- Control required/optional status

### 📋 Rules & Regulations Templates
- Predefined rules templates for different organizations
- Standard rules toggle with auto-population
- Custom rules editing when not using standards

### 💾 Auto-Save & Reuse
- Automatically save entered values for future reuse
- Smart autocomplete based on usage frequency
- Copy event functionality for quick duplication

## Quick Setup

### 1. Access System Configuration

Go to **Admin Dashboard** → **System Configuration** or navigate directly to `/admin/system-configuration`

### 2. Configure Categories

1. **Categories Tab**: Manage the main configuration categories
   - Add new categories (e.g., "Venue Types", "Equipment Categories")
   - Edit descriptions and activate/deactivate categories

2. **Options Tab**: Add values within each category
   - Event Categories: "Bass Competition", "SPL Competition", etc.
   - Organizations: "IASCA", "MECA", "USACi", etc.
   - Seasons: "2024", "2025", "2026", etc.

### 3. Set Up Rules Templates

1. **Rules Templates Tab**: Create reusable rules content
   - Add templates for different organizations
   - Set default templates for quick selection
   - Include organization-specific rules

## Using ConfigurableField Component

### Basic Usage

```tsx
import ConfigurableField from '../components/ConfigurableField';

// In your form component
<ConfigurableField
  formName="create_event"
  fieldName="category" 
  value={formData.category}
  onChange={(value) => setFormData({...formData, category: value})}
/>
```

### Multi-Select Field

```tsx
<ConfigurableField
  formName="create_event"
  fieldName="organization"
  value={formData.organizations} // Array for multi-select
  onChange={(value) => setFormData({...formData, organizations: value})}
/>
```

### Rules & Regulations Field

```tsx
<ConfigurableField
  formName="create_event"
  fieldName="rules_regulations"
  value={formData.rulesRegulations}
  onChange={(value) => setFormData({...formData, rulesRegulations: value})}
/>
```

### Event Copy Functionality

```tsx
import { useSystemConfiguration } from '../hooks/useSystemConfiguration';

const { copyEventData } = useSystemConfiguration();

const handleCopyEvent = async (sourceEventId: string) => {
  try {
    const copiedData = await copyEventData(sourceEventId);
    setFormData(copiedData);
  } catch (error) {
    console.error('Failed to copy event:', error);
  }
};
```

## Database Structure

### Configuration Categories
```sql
- id (UUID)
- name (string) - "event_categories", "organizations", etc.
- description (text)
- is_active (boolean)
```

### Configuration Options
```sql
- id (UUID)
- category_id (UUID) - Foreign key to categories
- key (string) - Unique identifier
- label (string) - Display name
- value (string) - Actual value
- sort_order (integer) - Display order
- metadata (JSONB) - Additional properties (color, icon, etc.)
```

### Form Field Configurations
```sql
- form_name (string) - "create_event", "edit_event", etc.
- field_name (string) - "category", "organization", etc.
- field_type (string) - "select", "multiselect", "textarea", etc.
- is_required (boolean)
- is_multiple (boolean)
- placeholder (string)
- help_text (string)
```

### Rules Templates
```sql
- name (string) - Template name
- organization_id (UUID) - Optional link to organization
- content (text) - Rules content
- is_default (boolean) - Default template flag
```

## Advanced Features

### Custom Validation Rules

Configure validation in the form field configuration:

```json
{
  "validation_rules": {
    "min_length": 5,
    "max_length": 100,
    "pattern": "^[A-Za-z0-9\\s]+$",
    "custom_message": "Please enter a valid event name"
  }
}
```

### Metadata Support

Add custom metadata to options:

```json
{
  "metadata": {
    "color": "#f97316",
    "icon": "volume-2", 
    "category_code": "BC",
    "point_multiplier": 1.5
  }
}
```

### Auto-Save Configuration

Form data is automatically saved when users enter values. Control this behavior:

- Values are saved per user, form, and field
- Most frequently used values appear first in dropdowns
- Saved data combines with configured options

## Admin Management

### Adding New Categories

1. Go to System Configuration → Categories
2. Click "Add Category"
3. Enter name (use snake_case: "venue_types")
4. Add description
5. Activate the category

### Adding Options to Categories

1. Go to System Configuration → Options  
2. Click "Add Option"
3. Select category
4. Enter key (unique identifier)
5. Enter label (display name)
6. Enter value (actual stored value)
7. Set sort order for display sequence

### Managing Rules Templates

1. Go to System Configuration → Rules Templates
2. Click "Add Template"
3. Enter template name
4. Optionally link to an organization
5. Enter rules content
6. Set as default if needed

## Form Integration Examples

### Create Event Form

```tsx
// Replace hardcoded dropdowns with configurable fields
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <ConfigurableField
    formName="create_event"
    fieldName="category"
    value={eventData.category}
    onChange={(value) => setEventData({...eventData, category: value})}
  />
  
  <ConfigurableField
    formName="create_event"
    fieldName="season_year"
    value={eventData.seasonYear}
    onChange={(value) => setEventData({...eventData, seasonYear: value})}
  />
  
  <ConfigurableField
    formName="create_event"
    fieldName="organization"
    value={eventData.organizations}
    onChange={(value) => setEventData({...eventData, organizations: value})}
  />
</div>

<ConfigurableField
  formName="create_event"
  fieldName="rules_regulations"
  value={eventData.rulesRegulations}
  onChange={(value) => setEventData({...eventData, rulesRegulations: value})}
/>
```

### User Registration Form

```tsx
<ConfigurableField
  formName="user_registration"
  fieldName="preferred_categories"
  value={userData.preferredCategories}
  onChange={(value) => setUserData({...userData, preferredCategories: value})}
/>

<ConfigurableField
  formName="user_registration"
  fieldName="home_region"
  value={userData.homeRegion}
  onChange={(value) => setUserData({...userData, homeRegion: value})}
/>
```

## Best Practices

### Category Naming
- Use descriptive, snake_case names
- Keep names consistent across related features
- Consider future expansion when naming

### Option Management
- Use consistent value formats
- Include sort_order for logical ordering
- Add helpful descriptions for admin clarity

### Rules Templates
- Create organization-specific templates
- Keep content up-to-date with latest rules
- Use clear, descriptive template names

### Form Integration
- Always handle loading states
- Provide fallbacks for missing configurations
- Use consistent field naming across forms

## Troubleshooting

### Field Not Showing Options
1. Check if category exists and is active
2. Verify form field configuration exists
3. Ensure options exist for the category
4. Check browser console for errors

### Rules Templates Not Loading
1. Verify templates are marked as active
2. Check organization ID mapping if using org-specific templates
3. Ensure default template is properly set

### Auto-Save Not Working
1. Check user authentication
2. Verify database permissions for saved_form_data table
3. Check for validation errors in saved values

## Migration from Hardcoded Values

### Step 1: Identify Hardcoded Dropdowns
Find components with hardcoded options like:
```tsx
const categories = ['Bass Competition', 'Championship', 'Competition'];
```

### Step 2: Create Configuration Categories
Add these as configuration categories and options through the admin interface.

### Step 3: Replace with ConfigurableField
Replace hardcoded selects with ConfigurableField components.

### Step 4: Update Form Processing
Ensure backend can handle the new field structure and values.

### Step 5: Test and Validate
Test all forms to ensure proper functionality and data saving.

---

This system provides a powerful foundation for managing dynamic content across your car audio events platform. The configuration approach ensures consistency, reduces code duplication, and provides administrators with the flexibility to adapt the platform to changing requirements. 