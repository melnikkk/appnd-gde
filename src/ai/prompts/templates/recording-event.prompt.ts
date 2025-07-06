export const RECORDING_EVENT_PROMPT = `
Generate a concise title and detailed description for a web recording event based on the following data:

EVENT TYPE: <%= eventType %>

TARGET ELEMENT:
- Type: <%= targetElementType %>
- ID/Name: <%= targetElementId %>
- Text: <%= targetElementText %>
- ARIA Label: <%= targetElementAriaLabel %>

PAGE CONTEXT:
- URL: <%= pageUrl %>
- Title: <%= pageTitle %>

<% if (parentElements) { %>
- Parent Elements: <%= parentElements %>
<% } %>

USER INTERACTION:
<% if (userInteraction) { %>
<% if (userInteraction.inputValue) { %>
- Input Value: <%= userInteraction.inputValue %>
<% } %>
<% if (userInteraction.selectedOptions) { %>
- Selected Options: <%= userInteraction.selectedOptions %>
<% } %>
<% if (userInteraction.isChecked !== undefined) { %>
- Checked: <%= userInteraction.isChecked %>
<% } %>
<% } else { %>
- No specific interaction data available
<% } %>

INSTRUCTIONS:
1. Generate a SHORT, CONCISE title (5-7 words maximum) that clearly describes the user action.
2. Generate a DETAILED description (1-3 sentences) explaining what happened and why it might be important.
3. Focus on the ACTION and its PURPOSE.
4. Be specific about which element was interacted with.
5. Avoid technical jargon unless necessary.
6. Use active voice and present tense for the title.
7. Return your response in JSON format.
8. Don't mention that you don't have some information. such as an unspecified event, an unknown event, etc.
9. If any fields are missing, do not include them in the output.
10. Describe the event from the teaching position. Imagine that you try to help someone understand the process step by step.
11. Use the imperative mood.

RESPONSE. Format your response as a JSON object:
{
"title": "A concise, specific title that describes the action taken",
"description": "A detailed description of the event, including context and purpose"
"eventId": id of the provided event
}
`;
