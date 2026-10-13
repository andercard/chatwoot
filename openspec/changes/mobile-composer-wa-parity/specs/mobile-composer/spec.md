## ADDED Requirements

### Requirement: Quick replies are two-line rows with a heading on phones
On viewports narrower than 640 px the system SHALL show each suggestion row with its title above its subtitle, and SHALL show the quick replies list under a "Quick replies" heading with an "Edit" link to the canned responses settings.

#### Scenario: Slash shows two-line rows
- **GIVEN** a conversation open on a viewport of 390 px
- **WHEN** the agent types `/` in the editor
- **THEN** every row shows the shortcut (without the slash) above its text and the list has a "Quick replies" heading with an "Edit" link

#### Scenario: Wider screens keep the floating picker
- **GIVEN** a viewport of 640 px or wider
- **WHEN** the agent types `/`
- **THEN** the floating picker opens as before, without the heading

### Requirement: The plus menu does not repeat the camera
On viewports narrower than 640 px the "+" menu SHALL offer Photos (the native picker, which already includes taking a photo) and Document, and SHALL NOT offer a separate Camera row.

#### Scenario: Menu rows
- **GIVEN** a reply to a WhatsApp conversation on a phone viewport
- **WHEN** the agent opens the "+" menu
- **THEN** it lists Photos and Document and no Camera row

### Requirement: Bar controls are centered and expand is always visible
On viewports narrower than 640 px the expand button SHALL be visible even when the editor is empty and unfocused, and the "+", sparkle, lock, expand and send controls SHALL share the vertical center of a one-line pill and stay at the bottom edge when the pill grows.

#### Scenario: One-line pill
- **GIVEN** an empty, unfocused composer on a 390 px viewport
- **WHEN** the bar is rendered
- **THEN** the expand button is visible and the five controls have the same vertical center as the pill (within 1 px)

### Requirement: Voice recorder bar with delete, pause and send on phones
On viewports narrower than 640 px, while a voice message is being recorded, the composer SHALL show the elapsed time and the live waveform, with delete, pause/resume and send buttons, and sending SHALL stop the recording and send the voice message once.

#### Scenario: Send while recording
- **GIVEN** the agent is recording a voice message on a phone viewport
- **WHEN** the agent taps send
- **THEN** the recording stops, the audio is attached and one message with the audio is sent

#### Scenario: Delete while recording
- **GIVEN** the agent is recording a voice message on a phone viewport
- **WHEN** the agent taps delete
- **THEN** the recording is discarded and nothing is attached

#### Scenario: Pause and resume
- **GIVEN** the agent is recording a voice message on a phone viewport
- **WHEN** the agent taps pause and then resume
- **THEN** the elapsed time freezes while paused and continues after resuming

### Requirement: Audio messages can be dragged along a bar
Audio messages SHALL show a bar of equal-height segments that the user can tap or drag in either direction to move the playback position.

#### Scenario: Drag to seek
- **GIVEN** an audio message in a conversation
- **WHEN** the user drags along the bar
- **THEN** the playback position follows the finger, limited between the start and the end
