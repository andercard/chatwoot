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

### Requirement: Format-first catalog dialog with per-format limits
The catalog dialog SHALL start by asking for the format (carousel, single product card or product list), SHALL list the products grouped by collection with a counter that prevents selecting more than the format allows, and SHALL require the fields of the format: a carousel allows 2 to 10 products and requires a message text (up to 1024 characters) without header or footer; a card allows exactly 1 product with optional text (up to 1024) and optional footer (up to 60); a list allows 1 to 30 products and requires a header and a message text, with an optional footer (up to 60). The message text SHALL be prefilled with the text already typed in the composer.

#### Scenario: Carousel limit
- **GIVEN** the carousel format with 10 products selected
- **WHEN** the agent tries to select an eleventh product
- **THEN** the product is not selected and the counter shows 10 / 10

#### Scenario: List requires header and text
- **GIVEN** the list format with products selected and no header
- **WHEN** the agent tries to send
- **THEN** sending is blocked and the header field shows it is required

#### Scenario: Card allows one product
- **GIVEN** the card format with one product selected
- **WHEN** the agent selects another product
- **THEN** the second product is not selected

#### Scenario: Text carried from the composer
- **GIVEN** the agent typed "Look at these options" in the composer
- **WHEN** the agent opens the catalog dialog
- **THEN** the message text field starts with "Look at these options" and the composer is cleared once the catalog is sent

### Requirement: One send creates one interactive WhatsApp message
Sending from the catalog dialog SHALL create exactly one outgoing message whose content is the body text and whose `whatsapp_catalog` content attribute stores the format, catalog ID, header, footer and a snapshot of the products, and the provider SHALL deliver it as the matching Meta interactive message: `carousel` with one `product` card per item, `product` for a card, or `product_list` with the products grouped into sections by collection. The server SHALL reject with 422 a request whose product count is outside the limits of the format, whose required fields are missing, whose catalog does not match the inbox or whose inbox is not WhatsApp Cloud.

#### Scenario: Carousel delivery
- **GIVEN** a request for a carousel with three products and a body text
- **WHEN** the message is delivered
- **THEN** Meta receives an interactive carousel with three product cards with consecutive card indexes and the same catalog ID, and no header, footer or buttons

#### Scenario: List delivery
- **GIVEN** a request for a list with products from two collections, a header and a body
- **WHEN** the message is delivered
- **THEN** Meta receives a product list with one section per collection, in selection order

#### Scenario: Over the limit
- **GIVEN** a request for a carousel with eleven products
- **WHEN** the server validates it
- **THEN** it responds 422 and no message is created

#### Scenario: Missing required field
- **GIVEN** a request for a list without a header
- **WHEN** the server validates it
- **THEN** it responds 422 and no message is created

### Requirement: Retrying a failed catalog message keeps the catalog
Retrying a failed catalog message SHALL resend it as the same interactive catalog message and SHALL NOT downgrade it to plain text.

#### Scenario: Retry after failure
- **GIVEN** a catalog message that failed to deliver
- **WHEN** the agent retries it
- **THEN** the message keeps its `whatsapp_catalog` attributes and is delivered as an interactive message

### Requirement: Catalog messages are shown like WhatsApp shows them
The conversation SHALL render a message with a `whatsapp_catalog` content attribute as WhatsApp shows it to the customer: a carousel as horizontally scrollable product cards with photo, title, price and a View action; a card as a single product card; a list with its header, collection name, item count and a View items action; the body text above and the footer when present. Opening a product SHALL show its photo gallery, title, price, description and link, SHALL show images only (never video) and SHALL NOT offer cart or order actions.

#### Scenario: Carousel bubble
- **GIVEN** an outgoing carousel message with three products
- **WHEN** the conversation is rendered
- **THEN** three product cards with photo, title and price scroll horizontally inside the bubble

#### Scenario: Product detail
- **GIVEN** a catalog bubble with a product that has several photos
- **WHEN** the agent clicks its View action
- **THEN** a detail view shows the photo gallery, title, price, description and link, and no add-to-order button

#### Scenario: Phone width
- **GIVEN** a 390 px viewport
- **WHEN** a catalog bubble is rendered
- **THEN** the page has no horizontal scroll and the carousel scrolls inside its own container

### Requirement: Optional catalog ID in the inbox settings
The settings of a WhatsApp Cloud inbox SHALL offer an optional catalog ID saved in the provider configuration; empty SHALL mean automatic discovery.

#### Scenario: Saving the catalog ID
- **GIVEN** the settings of a WhatsApp Cloud inbox
- **WHEN** an administrator saves a catalog ID
- **THEN** it is stored in the provider configuration and used to read the catalog
