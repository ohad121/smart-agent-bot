import OpenAI from 'openai';
import { LOGGER } from '../../logger';
import {
    ChatCompletion,
    ChatCompletionCreateParams,
} from 'openai/resources/chat';

const openAiClient = new OpenAI({
    apiKey: process.env.OPEN_AI_TOKEN,
});

export const createCompletion = async (params: ChatCompletionCreateParams): Promise<ChatCompletion | null> => {
    try {
        const response = await openAiClient.chat.completions.create(params);

        // Ensure the response is of the correct type
        if (response && 'id' in response && 'choices' in response) {
            return response;
        } else {
            LOGGER.error(`[createCompletion][Unexpected response type received]`);
            return null;
        }
    } catch (error) {
        LOGGER.error(`[createCompletion][Error while creating completion]`, {
            metadata: error,
        });
        return null;
    }
};
