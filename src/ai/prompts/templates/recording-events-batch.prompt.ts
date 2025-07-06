// TODO: Provide the recording context
// RECORDING DATA:
// - Company:
// - Industry:
// - Product Context:
// - Recording Purpose:
// - Recording Description:

export const RECORDING_EVENTS_BATCH_PROMPT = `
RECORDING EVENTS JSON:
<%= recordingEventsJson %>

Please return the response as a single JSON object with a key "events".

The value of "events" should be an array of objects, where each object contains:
- "eventId": The original ID of the event.
- "title": The generated title (5-7 words).
- "description": The generated description (1-3 sentences).

Generate the content for each event using the following EJS format template:

RECORING EVENT TEMPLATE:
<%= recordingEventPrompt %>
`;
