## ADDED Requirements

### Requirement: Catalog button in the WhatsApp Cloud composer
In every WhatsApp Cloud inbox, outside private notes, the composer SHALL show a Catalog button next to the other action buttons on desktop and a Catalog row in the "+" menu on phones. The button SHALL be shown whether or not a catalog is connected, SHALL be disabled outside the 24-hour messaging window with the reason the composer already shows, and SHALL NOT exist in other channels or in private notes.

#### Scenario: Button in a WhatsApp Cloud inbox
- **GIVEN** a conversation of a WhatsApp Cloud inbox inside the 24-hour window, in reply mode
- **WHEN** the composer is rendered
- **THEN** the Catalog button is visible on desktop and the Catalog row is in the "+" menu on a phone viewport

#### Scenario: Hidden in other channels and private notes
- **GIVEN** a conversation of a non-WhatsApp-Cloud inbox, or a WhatsApp Cloud conversation in private note mode
- **WHEN** the composer is rendered
- **THEN** there is no Catalog button

#### Scenario: Outside the messaging window
- **GIVEN** a WhatsApp Cloud conversation whose 24-hour window has expired
- **WHEN** the composer is rendered
- **THEN** the Catalog button is disabled

### Requirement: Setup guide when no catalog is available
When the catalog of the inbox cannot be read, the catalog dialog SHALL show a guide with what to do for the reported reason (no catalog connected, missing catalog permission, or Meta error) instead of the product list, and SHALL link to the inbox settings only for administrators.

#### Scenario: No catalog connected
- **GIVEN** a WhatsApp Cloud inbox without a connected catalog
- **WHEN** the agent clicks the Catalog button
- **THEN** the dialog explains how to connect a catalog or enter its ID in the inbox settings

#### Scenario: Missing permission
- **GIVEN** a WhatsApp Cloud inbox whose token lacks the catalog permission
- **WHEN** the agent opens the dialog
- **THEN** the guide names the missing permission and the manual catalog ID alternative

### Requirement: Catalog is read from Meta server-side
The system SHALL expose the catalog of a WhatsApp Cloud inbox, grouped by collection, using the catalog ID saved in the inbox provider configuration when present and the catalog connected to the WhatsApp Business account otherwise. The access token SHALL NOT be sent to the browser, and a failure to read SHALL be reported as a status (`no_catalog`, `missing_permission` or `error`) and not as a server error.

#### Scenario: Manual catalog ID wins
- **GIVEN** an inbox with `catalog_id` saved in its provider configuration
- **WHEN** the catalog is requested
- **THEN** that catalog is read and the connected-catalog lookup is not used

#### Scenario: Products outside any collection
- **GIVEN** a catalog with a product that belongs to no collection
- **WHEN** the catalog is requested
- **THEN** the product is returned under a collection for products without collection

### Requirement: Browse-then-select catalog dialog with search
The catalog dialog SHALL open on the products view showing the catalog with a search box, collection filters (the default Meta collection "All Products" SHALL NOT be listed) and each product exactly once with a "See more" action that opens its detail (photos, title, price, description, link, never video). A "Select" action SHALL enter selection mode with a counter limited to 30 products; continuing SHALL open a format view with a selector (carousel, single product card, product list) where the formats not allowed for the selected count are disabled with the reason, followed by the fields of the format: a carousel allows 2 to 10 products and requires a message text (up to 1024 characters) without header or footer; a card allows exactly 1 product with optional text (up to 1024) and optional footer (up to 60); a list allows 1 to 30 products and requires a header and a message text, with an optional footer (up to 60). The message text SHALL be prefilled with the text already typed in the composer.

#### Scenario: Product in several collections
- **GIVEN** a product that belongs to two collections
- **WHEN** the catalog is listed with the filter "All"
- **THEN** the product appears once

#### Scenario: See more shows the detail without selecting
- **GIVEN** the products view outside selection mode
- **WHEN** the agent clicks "See more" on a product
- **THEN** the detail opens with photos, price, description and link and the product is not selected

#### Scenario: Formats depend on the selection
- **GIVEN** selection mode with one product selected
- **WHEN** the agent continues to the format view
- **THEN** the carousel is disabled with a reason, and the card and the list are enabled

#### Scenario: Selection limit
- **GIVEN** selection mode with 30 products selected
- **WHEN** the agent tries to select another one
- **THEN** it is not selected and the counter shows 30 / 30

#### Scenario: List requires header and text
- **GIVEN** the list format with products selected and no header
- **WHEN** the agent tries to send
- **THEN** sending is blocked and the header field shows it is required

#### Scenario: Text carried from the composer
- **GIVEN** the agent typed "Look at these options" in the composer
- **WHEN** the agent opens the catalog dialog and reaches the format view
- **THEN** the message text field starts with "Look at these options" and the composer is cleared once the catalog is sent

### Requirement: Catalog loads in pages from Meta
The server SHALL expose the collections of the catalog (with their product counts, without the default Meta collection "All Products") separately from the products, and SHALL expose the products one page at a time with a cursor, an optional name search and an optional collection, each request reading a single page from Meta; the first page without search SHALL be cached for 15 minutes per inbox and collection. The dashboard SHALL load the first page and the collections together, request the next page when the agent scrolls to the end of the list, run the name search and the collection filter on the server after a short pause in typing, keep the loaded first page in memory for 5 minutes, and prefetch it silently when the composer of a WhatsApp Cloud conversation opens.

#### Scenario: Scrolling loads the next page
- **GIVEN** a catalog with more products than one page
- **WHEN** the agent scrolls to the end of the list
- **THEN** the next page is requested with the cursor of the previous one and appended without duplicates

#### Scenario: Search runs on the server
- **GIVEN** the products view
- **WHEN** the agent types "mesa" and stops typing
- **THEN** the first page matching that name is requested from the server and replaces the list

#### Scenario: Selection survives paging
- **GIVEN** two products selected on the first page
- **WHEN** the agent scrolls to a second page, searches, or changes collection
- **THEN** the two products remain selected and counted

#### Scenario: Prefetch makes the dialog instant
- **GIVEN** a WhatsApp Cloud conversation whose composer has been open for a few seconds
- **WHEN** the agent opens the catalog dialog
- **THEN** the collections and the first page are shown without a loading state

#### Scenario: Forced refresh
- **GIVEN** a cached catalog
- **WHEN** the agent presses the refresh action
- **THEN** the collections and the first page are read from Meta again and the cache is replaced

### Requirement: One catalog surface at a time and native mobile sheets
The catalog dialog and the product detail SHALL share one surface component: on desktop a centered dialog with a round close (X) button on the right, on phones (narrower than 640 px) a bottom sheet with a drag handle that closes when dragged down, without a close button. Opening a product from the catalog SHALL replace the catalog view inside the same surface instead of stacking a second dialog, and closing the detail SHALL return to the catalog view with its search, filter and selection intact.

#### Scenario: Detail replaces the list
- **GIVEN** the catalog dialog open on the products view
- **WHEN** the agent opens a product with "See more"
- **THEN** only the detail is visible and no second dialog or sheet is stacked

#### Scenario: Closing the detail returns to the list
- **GIVEN** the product detail open from the catalog with three products selected
- **WHEN** the agent closes the detail with the X (desktop) or drags the sheet down (phone)
- **THEN** the products view is shown again with the same search, filter and three selected products

#### Scenario: Drag to close on phones
- **GIVEN** the catalog sheet open on a 390 px viewport
- **WHEN** the agent drags the handle down past a third of the sheet height
- **THEN** the sheet slides down and closes

#### Scenario: Back arrow when the detail comes from the catalog
- **GIVEN** the catalog sheet on a phone and the agent opens a product with "See more"
- **WHEN** the detail is shown
- **THEN** a back arrow appears at the left of the header, and tapping it (or dragging the sheet down) returns to the products view

#### Scenario: Detail opened from the chat closes by dragging
- **GIVEN** a product opened from a catalog message in the conversation on a phone
- **WHEN** the agent drags the sheet down
- **THEN** the sheet closes, and no back arrow was shown
