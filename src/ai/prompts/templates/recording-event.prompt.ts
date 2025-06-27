export const RECORDING_EVENT_PROMPT = `
Generate a concise title and detailed description for a web recording event based on the following data:

EVENT TYPE: {{eventType}}

TARGET ELEMENT:
- Type: {{targetElementType}}
- ID/Name: {{targetElementId}}
- Text: {{targetElementText}}
- ARIA Label: {{targetElementAriaLabel}}

PAGE CONTEXT:
- URL: {{pageUrl}}
- Title: {{pageTitle}}
{{#if parentElements}}
- Parent Elements: {{parentElements}}
{{/if}}

USER INTERACTION:
{{#if userInteraction}}
{{#if userInteraction.inputValue}}
- Input Value: {{userInteraction.inputValue}}
{{/if}}
{{#if userInteraction.selectedOptions}}
- Selected Options: {{userInteraction.selectedOptions}}
{{/if}}
{{#if userInteraction.isChecked}}
- Checked: {{userInteraction.isChecked}}
{{/if}}
{{else}}
- No specific interaction data available
{{/if}}

ADDITIONAL CONTEXT:
{{#if additionalContext}}
{{#if additionalContext.companyName}}
- Company: {{additionalContext.companyName}}
{{/if}}
{{#if additionalContext.industry}}
- Industry: {{additionalContext.industry}}
{{/if}}
{{#if additionalContext.productContext}}
- Product Context: {{additionalContext.productContext}}
{{/if}}
{{#if additionalContext.recordingPurpose}}
- Recording Purpose: {{additionalContext.recordingPurpose}}
{{/if}}
{{#if additionalContext.recordingDescription}}
- Recording Description: {{additionalContext.recordingDescription}}
{{/if}}
{{else}}
- No additional context available
{{/if}}

INSTRUCTIONS:
1. Generate a SHORT, CONCISE title (5-7 words maximum) that clearly describes the user action.
2. Generate a DETAILED description (1-3 sentences) explaining what happened and why it might be important.
3. Focus on the ACTION and its PURPOSE.
4. Be specific about which element was interacted with.
5. Avoid technical jargon unless necessary.
6. Use active voice and present tense for the title.
7. Return your response in JSON format.

Format your response as a JSON object:
{
  "title": "A concise, specific title that describes the action taken",
  "description": "A detailed description of the event, including context and purpose"
}
`;
