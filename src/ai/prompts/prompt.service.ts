import { Injectable, Logger } from '@nestjs/common';
import { RECORDING_EVENT_PROMPT } from './templates/recording-event.prompt';
import { RecordingEventDataDto } from '../dto/recording-event-data.dto';
import { AiInvalidPromptException } from '../exceptions';

@Injectable()
export class PromptService {
  private readonly logger = new Logger(PromptService.name);

  constructRecordingEventPrompt(eventData: RecordingEventDataDto): string {
    try {
      let prompt = RECORDING_EVENT_PROMPT.replace('{{eventType}}', eventData.eventType)
        .replace(
          '{{targetElementType}}',
          eventData.targetElement.elementType || 'unknown',
        )
        .replace(
          '{{targetElementId}}',
          eventData.targetElement.elementId ||
            eventData.targetElement.elementName ||
            'N/A',
        )
        .replace('{{targetElementText}}', eventData.targetElement.textContent || 'N/A')
        .replace('{{targetElementAriaLabel}}', eventData.targetElement.ariaLabel || 'N/A')
        .replace('{{pageUrl}}', eventData.pageContext.url || 'unknown')
        .replace('{{pageTitle}}', eventData.pageContext.title || 'unknown');

      if (
        eventData.pageContext.parentElements &&
        eventData.pageContext.parentElements.length > 0
      ) {
        const parentElementsText = eventData.pageContext.parentElements
          .map((el) => `${el.elementType}${el.textContent ? ` (${el.textContent})` : ''}`)
          .join(', ');

        prompt = prompt.replace(
          /{{#if parentElements}}[\s\S]*?{{\/if}}/,
          `- Parent Elements: ${parentElementsText}`,
        );
      } else {
        prompt = prompt.replace(/{{#if parentElements}}[\s\S]*?{{\/if}}/, '');
      }

      if (eventData.userInteraction) {
        let interactionText = '';

        if (eventData.userInteraction.inputValue) {
          interactionText += `- Input Value: ${eventData.userInteraction.inputValue}\n`;
        }

        if (
          eventData.userInteraction.selectedOptions &&
          eventData.userInteraction.selectedOptions.length > 0
        ) {
          interactionText += `- Selected Options: ${eventData.userInteraction.selectedOptions.join(', ')}\n`;
        }

        if (eventData.userInteraction.isChecked !== undefined) {
          interactionText += `- Checked: ${eventData.userInteraction.isChecked}\n`;
        }

        if (interactionText) {
          prompt = prompt.replace(
            /{{#if userInteraction}}[\s\S]*?{{else}}[\s\S]*?{{\/if}}/,
            interactionText.trim(),
          );
        } else {
          prompt = prompt.replace(
            /{{#if userInteraction}}[\s\S]*?{{else}}[\s\S]*?{{\/if}}/,
            '- No specific interaction data available',
          );
        }
      } else {
        prompt = prompt.replace(
          /{{#if userInteraction}}[\s\S]*?{{else}}[\s\S]*?{{\/if}}/,
          '- No specific interaction data available',
        );
      }

      if (eventData.additionalContext) {
        let contextText = '';

        if (eventData.additionalContext.companyName) {
          contextText += `- Company: ${eventData.additionalContext.companyName}\n`;
        }

        if (eventData.additionalContext.industry) {
          contextText += `- Industry: ${eventData.additionalContext.industry}\n`;
        }

        if (eventData.additionalContext.productContext) {
          contextText += `- Product Context: ${eventData.additionalContext.productContext}\n`;
        }

        if (eventData.additionalContext.recordingPurpose) {
          contextText += `- Recording Purpose: ${eventData.additionalContext.recordingPurpose}\n`;
        }

        if (eventData.additionalContext.recordingDescription) {
          contextText += `- Recording Description: ${eventData.additionalContext.recordingDescription}\n`;
        }

        if (contextText) {
          prompt = prompt.replace(
            /{{#if additionalContext}}[\s\S]*?{{else}}[\s\S]*?{{\/if}}/,
            contextText.trim(),
          );
        } else {
          prompt = prompt.replace(
            /{{#if additionalContext}}[\s\S]*?{{else}}[\s\S]*?{{\/if}}/,
            '- No additional context available',
          );
        }
      } else {
        prompt = prompt.replace(
          /{{#if additionalContext}}[\s\S]*?{{else}}[\s\S]*?{{\/if}}/,
          '- No additional context available',
        );
      }

      prompt = prompt.replace(/{{#if .*?}}|{{\/if}}|{{else}}|{{.*?}}/g, '');

      return prompt;
    } catch (error) {
      throw new AiInvalidPromptException(
        `Failed to construct prompt for ${eventData.eventType} event`,
        {
          eventType: eventData.eventType,
          error: error.message,
        },
      );
    }
  }

  constructJsonRecordingEventPrompt(eventData: RecordingEventDataDto): string {
    try {
      let prompt = RECORDING_EVENT_PROMPT.replace('{{eventType}}', eventData.eventType)
        .replace(
          '{{targetElementType}}',
          eventData.targetElement.elementType || 'unknown',
        )
        .replace(
          '{{targetElementId}}',
          eventData.targetElement.elementId ||
            eventData.targetElement.elementName ||
            'N/A',
        )
        .replace('{{targetElementText}}', eventData.targetElement.textContent || 'N/A')
        .replace('{{targetElementAriaLabel}}', eventData.targetElement.ariaLabel || 'N/A')
        .replace('{{pageUrl}}', eventData.pageContext.url || 'unknown')
        .replace('{{pageTitle}}', eventData.pageContext.title || 'unknown');

      if (
        eventData.pageContext.parentElements &&
        eventData.pageContext.parentElements.length > 0
      ) {
        const parentElementsText = eventData.pageContext.parentElements
          .map((el) => `${el.elementType}${el.textContent ? ` (${el.textContent})` : ''}`)
          .join(', ');

        prompt = prompt.replace(
          /{{#if parentElements}}[\s\S]*?{{\/if}}/,
          `- Parent Elements: ${parentElementsText}`,
        );
      } else {
        prompt = prompt.replace(/{{#if parentElements}}[\s\S]*?{{\/if}}/, '');
      }

      if (eventData.userInteraction) {
        let interactionText = '';

        if (eventData.userInteraction.inputValue) {
          interactionText += `- Input Value: ${eventData.userInteraction.inputValue}\n`;
        }

        if (
          eventData.userInteraction.selectedOptions &&
          eventData.userInteraction.selectedOptions.length > 0
        ) {
          interactionText += `- Selected Options: ${eventData.userInteraction.selectedOptions.join(', ')}\n`;
        }

        if (eventData.userInteraction.isChecked !== undefined) {
          interactionText += `- Checked: ${eventData.userInteraction.isChecked}\n`;
        }

        if (interactionText) {
          prompt = prompt.replace(
            /{{#if userInteraction}}[\s\S]*?{{else}}[\s\S]*?{{\/if}}/,
            interactionText.trim(),
          );
        } else {
          prompt = prompt.replace(
            /{{#if userInteraction}}[\s\S]*?{{else}}[\s\S]*?{{\/if}}/,
            '- No specific interaction data available',
          );
        }
      } else {
        prompt = prompt.replace(
          /{{#if userInteraction}}[\s\S]*?{{else}}[\s\S]*?{{\/if}}/,
          '- No specific interaction data available',
        );
      }

      if (eventData.additionalContext) {
        let contextText = '';

        if (eventData.additionalContext.companyName) {
          contextText += `- Company: ${eventData.additionalContext.companyName}\n`;
        }

        if (eventData.additionalContext.industry) {
          contextText += `- Industry: ${eventData.additionalContext.industry}\n`;
        }

        if (eventData.additionalContext.productContext) {
          contextText += `- Product Context: ${eventData.additionalContext.productContext}\n`;
        }

        if (eventData.additionalContext.recordingPurpose) {
          contextText += `- Recording Purpose: ${eventData.additionalContext.recordingPurpose}\n`;
        }

        if (eventData.additionalContext.recordingDescription) {
          contextText += `- Recording Description: ${eventData.additionalContext.recordingDescription}\n`;
        }

        if (contextText) {
          prompt = prompt.replace(
            /{{#if additionalContext}}[\s\S]*?{{else}}[\s\S]*?{{\/if}}/,
            contextText.trim(),
          );
        } else {
          prompt = prompt.replace(
            /{{#if additionalContext}}[\s\S]*?{{else}}[\s\S]*?{{\/if}}/,
            '- No additional context available',
          );
        }
      } else {
        prompt = prompt.replace(
          /{{#if additionalContext}}[\s\S]*?{{else}}[\s\S]*?{{\/if}}/,
          '- No additional context available',
        );
      }

      prompt = prompt.replace(/{{#if .*?}}|{{\/if}}|{{else}}|{{.*?}}/g, '');

      return prompt;
    } catch (error) {
      throw new AiInvalidPromptException(
        `Failed to construct JSON prompt for ${eventData.eventType} event`,
        {
          eventType: eventData.eventType,
          error: error.message,
        },
      );
    }
  }

  constructJsonBatchRecordingEventPrompt(
    recordingEventsData: Array<RecordingEventDataDto>,
  ): string {
    try {
      const recordingEventsJson = JSON.stringify(
        recordingEventsData.map((recordingEvent) => ({
          eventId: recordingEvent.eventId,
          eventType: recordingEvent.eventType,
          targetElement: recordingEvent.targetElement,
          pageContext: recordingEvent.pageContext,
          userInteraction: recordingEvent.userInteraction,
          timestamp: recordingEvent.timestamp,
        })),
        null,
        2,
      );

      const prompt = `
        Given the following JSON array of recording events, please generate a concise title and a 1-3 sentence description for each event.
        The context for these events is as follows:
        - Company: ${recordingEventsData[0]?.additionalContext?.companyName || 'N/A'}
        - Industry: ${recordingEventsData[0]?.additionalContext?.industry || 'N/A'}
        - Product Context: ${
          recordingEventsData[0]?.additionalContext?.productContext || 'N/A'
        }
        - Recording Purpose: ${
          recordingEventsData[0]?.additionalContext?.recordingPurpose || 'N/A'
        }
        - Recording Description: ${
          recordingEventsData[0]?.additionalContext?.recordingDescription || 'N/A'
        }

        Events data:
        ${recordingEventsJson}

        Please return the response as a single JSON object with a key "events".
        The value of "events" should be an array of objects, where each object contains:
        - "eventId": The original ID of the event.
        - "title": The generated title (5-7 words).
        - "description": The generated description (1-3 sentences).
      `;

      return prompt;
    } catch (error) {
      throw new AiInvalidPromptException(`Failed to construct batch prompt`, {
        eventCount: recordingEventsData.length,
        error: error.message,
      });
    }
  }

  // parseAiResponse(response: string): {
  //   title: string;
  //   description: string;
  //   confidence: number;
  // } {
  //   try {
  //     try {
  //       const parsedJson = JSON.parse(response);

  //       if (parsedJson.title && parsedJson.description) {
  //         return {
  //           title: parsedJson.title,
  //           description: parsedJson.description,
  //           confidence: 0.95,
  //         };
  //       }
  //     } catch (error) {
  //       this.logger.debug('Response is not valid JSON, using regex parsing');
  //     }

  //     const titleMatch = response.match(/TITLE:\s*(.*?)(?=\n|DESCRIPTION:|$)/s);
  //     const descriptionMatch = response.match(/DESCRIPTION:\s*(.*?)(?=\n|$)/s);
  //     const title = titleMatch ? titleMatch[1].trim() : '';
  //     const description = descriptionMatch ? descriptionMatch[1].trim() : '';

  //     let confidence = 0.7;

  //     if (title && description) {
  //       confidence += 0.2;
  //     } else if (title || description) {
  //       confidence += 0.1;
  //     }

  //     if (title && title.length > 3 && title.length < 50) {
  //       confidence += 0.05;
  //     }

  //     if (description && description.length > 20) {
  //       confidence += 0.05;
  //     }

  //     confidence = Math.min(confidence, 1.0);

  //     return {
  //       title,
  //       description,
  //       confidence,
  //     };
  //   } catch (error) {
  //     this.logger.error(`Error parsing AI response: ${error.message}`, error.stack);

  //     return {
  //       title: 'Untitled Action',
  //       description: 'Action details could not be generated.',
  //       confidence: 0.5,
  //     };
  //   }
  // }
}
