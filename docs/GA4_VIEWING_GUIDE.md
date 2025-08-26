# GA4 Data Viewing Guide - Car Audio Events

## How to See Event Names and Page Names in GA4

### 1. Real-Time Reports
**Path**: Reports → Realtime
- Shows live data as it happens
- Look for "Event name" and "Page title" columns
- You'll now see specific event names like:
  - `viewed_event_dbs_for_dads`
  - `view_category_iasca`
  - Event names with actual titles

### 2. Enhanced E-commerce Reports
**Path**: Reports → Monetization → Ecommerce purchases
- Events are tracked as "items" with full details:
  - Item name: The actual event name
  - Item category: Event category (IASCA, MECA, etc.)
  - Item category2: Sanctioning body
  - Item category3: State
  - Item category4: City

### 3. Events Report
**Path**: Reports → Engagement → Events
- Click on any event name to see parameters
- Look for these parameters:
  - `page_title`: The readable page name
  - `custom_page_title`: Enhanced page title
  - `label`: Contains event/page names
  - `item_name`: Event names in view_item events

### 4. Custom Reports (Recommended)
To create a report showing event names clearly:

1. Go to **Explore** → **Free form**
2. Add dimensions:
   - Event name
   - Page title
   - Event parameter: label
   - Item name (for events)
3. Add metrics:
   - Event count
   - Users
   - Engagement time
4. Save the report for future use

### 5. Setting Up Custom Dimensions
To make event names more visible:

1. Go to **Admin** → **Custom definitions**
2. Click **Create custom dimension**
3. Create these dimensions:
   - **Event Label**: 
     - Scope: Event
     - Event parameter: label
   - **Custom Page Title**:
     - Scope: Event
     - Event parameter: custom_page_title
   - **Event ID**:
     - Scope: Event
     - Event parameter: event_id

### What You'll See Now

#### For Page Views:
- **page_title**: "Home", "Events Directory", "Event Details - 123"
- **custom_page_title**: Same as above but as a custom parameter

#### For Event Views:
- **Event name**: `viewed_event_redemption_day` (specific event name)
- **Label parameter**: "Redemption Day" (human-readable)
- **view_item event**: Full e-commerce data with event details

#### For Categories:
- **Event name**: `view_category_iasca`
- **Label**: "IASCA - Redemption Day"

### Tips for Better Reporting

1. **Use the Search Bar**: In any report, search for specific event names
2. **Create Audiences**: Build audiences based on viewed events
3. **Set Up Conversions**: Mark important events as conversions
4. **Use Comparisons**: Compare different event categories

### Debug Mode
In the Realtime report, you can enable DebugView:
1. Click the settings icon
2. Enable "DebugView"
3. See all parameters being sent

---
Last Updated: January 2025