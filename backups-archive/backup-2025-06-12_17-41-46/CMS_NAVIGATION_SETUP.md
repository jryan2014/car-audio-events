# CMS Pages Navigation Setup Guide

## Overview
The CMS Pages system now includes comprehensive navigation placement options, allowing you to specify exactly where each page appears on your website.

## Navigation Placement Options

### 1. **None - Standalone Page**
- Page exists but doesn't appear in any navigation
- Accessible only via direct URL
- Perfect for landing pages, special offers, or internal pages

### 2. **Top Navigation**
- Page appears in the main site navigation bar
- Visible to all visitors
- Best for important pages like "About Us", "Contact", etc.

### 3. **Sub Navigation**
- Page appears as a dropdown item under a main navigation item
- Choose parent menu: Events, Directory, About, or Resources
- Great for organizing related content

### 4. **Footer Navigation**
- Page appears in the website footer
- Choose from footer sections:
  - **Company**: About, Team, Careers, etc.
  - **Quick Links**: Popular pages, shortcuts
  - **Legal**: Privacy Policy, Terms of Service, etc.
  - **Support**: Help, FAQ, Contact
  - **Social**: Social media links, community pages

## Footer Section Layout
```
Company     | Quick Links | Legal        | Support    | Social
------------|-------------|--------------|------------|--------
About Us    | Events      | Privacy      | Help       | Facebook
Our Team    | Directory   | Terms        | FAQ        | Twitter
Careers     | Pricing     | Cookies      | Contact    | Instagram
History     | Blog        | Disclaimer   | Support    | YouTube
```

## Database Migration Required

Before using these features, run the database migration:

```sql
-- Run this in your Supabase SQL editor
\i database/migrations/add_cms_navigation_fields.sql
```

This adds the following columns to `cms_pages`:
- `navigation_placement` - Where the page appears
- `parent_nav_item` - Parent menu for sub navigation
- `footer_section` - Footer section for footer placement
- `nav_order` - Order in navigation (1 = first)
- `nav_title` - Custom title for navigation (optional)
- `show_in_sitemap` - Include in XML sitemap for SEO

## Using the Navigation Features

### Creating a New Page
1. Go to **Admin → CMS Pages**
2. Click **"Create Page"**
3. Fill in basic page information
4. In the **Navigation Settings** section:
   - Choose placement type
   - Configure placement-specific options
   - Set navigation order (optional)
   - Customize navigation title (optional)

### Navigation Settings Explained

#### Navigation Placement
- **None**: Page won't appear in navigation
- **Top Navigation**: Main navigation bar
- **Sub Navigation**: Dropdown under main menu item
- **Footer**: Website footer section

#### Conditional Fields
- **Sub Navigation**: Select parent menu item
- **Footer**: Choose footer section
- **Navigation Title**: Custom text for navigation (defaults to page title)
- **Navigation Order**: Position in navigation (1 = first, 2 = second, etc.)

#### SEO Options
- **Show in Sitemap**: Include page in XML sitemap for search engines

## Best Practices

### Page Organization
- Use **Top Navigation** for 5-7 most important pages
- Use **Sub Navigation** to organize related content
- Use **Footer** for legal, support, and secondary pages
- Use **None** for landing pages and special campaigns

### Navigation Order
- Use increments of 10 (10, 20, 30) to allow easy reordering
- Lower numbers appear first
- Leave gaps for future additions

### Footer Sections
- **Company**: Brand-related pages
- **Quick Links**: Most popular/useful pages
- **Legal**: Required legal pages (Privacy, Terms, etc.)
- **Support**: Help and contact information
- **Social**: Community and social media

### SEO Considerations
- Enable **Show in Sitemap** for public pages
- Disable for internal tools, admin pages, or temporary content
- Use descriptive navigation titles for better UX

## Implementation Notes

### Database Schema
The navigation fields are stored as metadata in the `cms_pages` table with proper constraints and indexes for performance.

### Frontend Integration
Pages will automatically appear in navigation based on their placement settings. The system provides:
- Automatic navigation generation
- Proper ordering and hierarchy
- SEO-friendly URLs
- Responsive design support

### Admin Interface
The CMS admin interface shows:
- Navigation placement badges
- Order numbers
- Sitemap inclusion status
- Quick edit access for all navigation settings

## Troubleshooting

### Page Not Appearing in Navigation
1. Check navigation placement is not set to "None"
2. Verify page status is "Published"
3. Check navigation order conflicts
4. Ensure parent menu exists (for sub navigation)

### Footer Section Not Showing
1. Confirm footer section is selected
2. Check if footer template includes the section
3. Verify page is published and active

### Navigation Order Issues
1. Use unique order numbers
2. Start with increments of 10
3. Check for duplicate order values
4. Remember: lower numbers = higher position

## Future Enhancements

Planned features:
- Visual navigation builder
- Drag-and-drop ordering
- Navigation preview
- Bulk navigation updates
- Custom navigation groups
- Multi-level sub navigation 