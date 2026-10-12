## ADDED Requirements

### Requirement: Suggestion lists sit above the composer on phones
On viewports narrower than 640 px the system SHALL show the mention, canned response, macro and variable suggestions as a full-width list of one-line rows placed directly above the composer bar, and SHALL keep the keyboard focus in the editor while the list is open.

#### Scenario: Slash opens the canned responses above the bar
- **GIVEN** a conversation open on a viewport of 390 px with the on-screen keyboard shown
- **WHEN** the agent types `/` in the editor
- **THEN** a full-width list of canned responses appears above the composer bar, without a search field, and the editor still has the focus

#### Scenario: Typing after the trigger filters the list
- **GIVEN** the canned response list is open above the bar
- **WHEN** the agent types more characters after the `/`
- **THEN** the rows are filtered by the text typed in the editor

#### Scenario: Tapping a row inserts it and keeps the keyboard
- **GIVEN** the list is open above the bar
- **WHEN** the agent taps a row
- **THEN** the item is inserted in the editor, the list closes and the editor keeps the focus

#### Scenario: Mention list in a private note
- **GIVEN** the composer is in private note mode on a phone viewport
- **WHEN** the agent types `@`
- **THEN** the agents and teams appear as rows above the bar and filter with the text typed after the `@`

#### Scenario: Wider screens keep the floating picker
- **GIVEN** a viewport of 640 px or wider
- **WHEN** the agent types `/` or `@`
- **THEN** the floating picker with its own search field opens as before

### Requirement: Compact composer bar on phones
On viewports narrower than 640 px the system SHALL render the composer as a single row with the plus menu, the AI button, a pill-shaped editor and a round send button, and SHALL show the private note lock inside the pill instead of the Reply and Private Note tabs.

#### Scenario: Row layout
- **GIVEN** a conversation open on a viewport of 390 px
- **WHEN** the composer is shown
- **THEN** the plus button, the AI button, the editor pill and the round send button are on the same row

#### Scenario: Lock toggles private note
- **GIVEN** the composer is in reply mode on a phone viewport
- **WHEN** the agent taps the lock inside the pill
- **THEN** the composer switches to private note and the pill and the send button turn amber

#### Scenario: Restricted replies force the note
- **GIVEN** replies are restricted for the conversation
- **WHEN** the composer is shown on a phone viewport
- **THEN** the composer is in private note mode and the lock cannot be switched off

#### Scenario: The pill grows with the text
- **GIVEN** an empty compact composer
- **WHEN** the agent types several lines
- **THEN** the pill grows up to about five lines and then scrolls

### Requirement: The editor can still be expanded on phones
The system SHALL keep the expand control available on phones as an icon in the top end corner of the pill, shown while the editor has focus or content, and SHALL return to the compact height after a message is sent.

#### Scenario: Expand and collapse
- **GIVEN** the editor has focus on a phone viewport
- **WHEN** the agent taps the expand icon and later sends the message
- **THEN** the editor grows to the expanded height with its drag handle, and goes back to the compact pill after sending

### Requirement: The plus menu holds every composer action on phones
The system SHALL list in the plus menu Photos, Camera, Attach files, Macros and the templates of the channel, plus the voice recorder, the signature toggle, the quoted reply toggle, the article search and the contact info request when each applies.

#### Scenario: Each row opens its action
- **GIVEN** the plus menu is open on a phone viewport
- **WHEN** the agent taps Photos, Camera or Attach files
- **THEN** the matching native file picker opens and the menu closes

#### Scenario: Macros row opens the macro list
- **GIVEN** the plus menu is open and macros are enabled
- **WHEN** the agent taps Macros
- **THEN** the macro list opens above the bar

#### Scenario: Round send button sends
- **GIVEN** the editor has a message on a phone viewport
- **WHEN** the agent taps the round send button
- **THEN** the message is sent and the editor goes back to the compact pill

### Requirement: Screens of 640 px or wider keep the current composer
The system SHALL keep the composer layout, the tabs and the floating pickers unchanged on viewports of 640 px or wider.

#### Scenario: Desktop is unchanged
- **GIVEN** a viewport of 1440 px
- **WHEN** a conversation is open
- **THEN** the Reply and Private Note tabs are shown and there is no plus button in the composer
