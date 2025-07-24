# Audio Components Table Structure

Based on the code analysis, the `audio_components` table has the following structure:

## Table: audio_components

### Columns:
1. **id** - Primary key (likely UUID, auto-generated)
2. **audio_system_id** - Foreign key to `user_audio_systems` table
3. **component_type** - Type of component (e.g., 'amplifier', 'subwoofer', 'speaker', etc.)
4. **brand** - Brand name of the component
5. **model** - Model name/number of the component
6. **notes** - Optional notes/description about the component
7. **specifications** - JSONB field containing component-specific details:
   - `power_watts` - Power rating in watts
   - `rms_watts` - RMS power rating
   - `impedance` - Impedance rating (ohms)
   - `size` - Physical size of the component
   - `quantity` - Number of units (if more than 1)
8. **price** - Optional price of the component
9. **created_at** - Timestamp (likely auto-generated)
10. **updated_at** - Timestamp (likely auto-generated)

### Relationships:
- **Foreign Key**: `audio_system_id` references `user_audio_systems.id`
- The table is queried with `user_audio_systems` in the Profile page using a join

### Usage Context:
- Users can add audio components to their audio systems
- Components are categorized by type (amplifier, subwoofer, etc.)
- Specifications are stored flexibly in a JSONB field to accommodate different component types
- Components are associated with a specific audio system, which belongs to a user

### Related Tables:
- `user_audio_systems` - Parent table containing user's audio system configurations
- `audio_system_links` - Related table for storing links/references about the audio system

### Row Level Security (RLS):
- The table has RLS enabled (confirmed by successful query with empty results)
- Users likely can only access components associated with their own audio systems