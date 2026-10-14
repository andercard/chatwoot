## ADDED Requirements

### Requirement: The phone composer is a single capsule
On viewports narrower than 640 px the composer SHALL be one rounded capsule that holds the "+" menu, the editor, the private note lock and a round button on the right, all vertically centered on one line. The round button SHALL be a microphone when the editor is empty and nothing is attached, and the send arrow otherwise.

#### Scenario: Empty composer
- **GIVEN** an empty composer on a 390 px viewport
- **WHEN** the composer is rendered
- **THEN** the "+", the editor, the lock and a microphone button sit inside one capsule with the same vertical center

#### Scenario: Typing swaps the microphone for send
- **GIVEN** an empty composer on a phone viewport
- **WHEN** the agent types a character
- **THEN** the round button becomes the send arrow

### Requirement: The capsule grows like a chat app
When the text needs more than one line, the capsule SHALL show the AI button at the top left and the expand button at the top right, keep the text in the middle and anchor "+", lock and send to the bottom; when expanded it SHALL show the AI button and a collapse button on top and "+", lock and send on the bottom row.

#### Scenario: Several lines
- **GIVEN** a phone composer with one line of text
- **WHEN** the text wraps to a second line
- **THEN** the AI and expand buttons appear at the top corners

#### Scenario: One line hides AI and expand
- **GIVEN** a phone composer with a single line
- **WHEN** the composer is rendered
- **THEN** the AI and expand buttons are not visible

### Requirement: Voice recorder bar with preview
While a voice message is being recorded, on any viewport, the composer SHALL be replaced by one bar with delete, the live waveform with the elapsed time, pause and send. Pausing SHALL stop the recording and show a preview with play, a draggable waveform, the duration, a record-again button and send.

#### Scenario: Pause to listen
- **GIVEN** the agent is recording
- **WHEN** the agent taps pause
- **THEN** the recording stops and the bar shows play, a draggable waveform and the duration

#### Scenario: Send once
- **GIVEN** the agent is recording or previewing
- **WHEN** the agent taps send
- **THEN** one message with the voice note is sent

#### Scenario: Delete
- **GIVEN** the agent is recording or previewing
- **WHEN** the agent taps delete
- **THEN** nothing is attached and the composer comes back

### Requirement: Voice notes play in browsers without Ogg Opus support
When the browser cannot play Ogg Opus audio, the system SHALL decode the voice note in the browser and play it, and SHALL NOT download the decoder in browsers that can play it.

#### Scenario: Safari
- **GIVEN** a browser whose audio element cannot play Ogg Opus
- **WHEN** the agent taps play on an Ogg Opus voice note
- **THEN** the note is decoded to WAV and plays
