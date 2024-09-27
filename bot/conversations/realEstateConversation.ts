import { BotContext } from '../types';
import { handleRealEstateCommand, generateMapUrl } from '../../api/real-estate/real-estate-handler';
import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { InputMediaPhoto } from 'grammy/out/types.node';

type MyContext = BotContext & ConversationFlavor;

// Constants
const CANCEL_COMMAND = '/cancel';
const ITEMS_PER_PAGE = 5;

// Helper Functions
const isCancel = (message: string): boolean => message === CANCEL_COMMAND;

const generateListingText = (item: any, index: number, total: number): string => {
    let text = `🏠 <b>${item.additionalDetails.property.text}</b>\n`;
    text += `📍 <b>City:</b> ${item.address.city.text}\n`;
    if (item.address.neighborhood) {
        text += `🏘️ <b>Neighborhood:</b> ${item.address.neighborhood.text}\n`;
    }
    if (item.address.street) {
        text += `🛣️ <b>Street:</b> ${item.address.street.text}${item.address.house?.number ? ` ${item.address.house.number}` : ''}\n`;
    }
    if (item.address.house?.floor !== undefined) {
        text += `🧱 <b>Floor:</b> ${item.address.house.floor}\n`;
    }
    text += `💰 <b>Price:</b> ${item.price.toLocaleString()} ₪\n`;
    text += `🛏️ <b>Rooms:</b> ${item.additionalDetails.roomsCount}\n`;
    text += `📏 <b>Size:</b> ${item.additionalDetails.squareMeter} m²\n`;
    text += `📄 <b>Listing ${index + 1} of ${total}</b>\n`;
    return text;
};

// Main Conversation Handler
export const realestateConversation = async (conversation: Conversation<MyContext>, ctx: MyContext) => {
    while (true) {
        await ctx.reply('📝 Please describe the real estate you are looking for, or type /cancel to exit.');

        const message = await conversation.wait();

        if (isCancel(message?.message?.text || '')) {
            await handleExit(ctx);
            return;
        }

        const userInput = message?.message?.text || '';

        try {
            const { realEstateItems, queryParams } = await handleRealEstateCommand(userInput);
            await handleSearchResults(ctx, conversation, realEstateItems, queryParams.searchUrl);
        } catch (error) {
            console.error('Error processing real estate request:', error);
            await ctx.reply('⚠️ An error occurred while processing your request. Please try again later.');
        }
    }
};

// Helper Functions for Conversation Flow
async function handleSearchResults(ctx: MyContext, conversation: Conversation<MyContext>, realEstateItems: any[], searchUrl: string) {
    const listingsCount = realEstateItems.length;

    if (listingsCount === 0) {
        await ctx.reply(`😔 No real estate listings found for your criteria.\n🔍 Search URL: ${searchUrl}`);
        return;
    }

    await ctx.reply(`🎉 Found <b>${listingsCount}</b> listings for you! 🏡\n🔗 <a href="${searchUrl}">View on Yad2</a>`, { parse_mode: 'HTML' });
    conversation.session.realEstateItems = realEstateItems;
    conversation.session.currentItemIndex = 0;
    await presentRealEstateItem(ctx, conversation);
}

async function presentRealEstateItem(ctx: MyContext, conversation: Conversation<MyContext>) {
    try {
        const index = conversation.session.currentItemIndex ?? 0;
        const items = conversation.session.realEstateItems ?? [];

        if (index >= items.length) {
            await ctx.reply('🚫 No more listings available.');
            return;
        }

        const item = items[index];
        if (!item) {
            throw new Error('Item not found');
        }

        const text = generateListingText(item, index, items.length);
        const mediaGroup = await prepareMediaGroup(item);

        await ctx.replyWithMediaGroup(mediaGroup);
        await ctx.reply(text, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '➡️ Next', callback_data: 'next' },
                        { text: '🔗 View Listing', url: `https://www.yad2.co.il/realestate/item/${item.token}` },
                    ],
                ],
            },
        });

        await handleUserAction(ctx, conversation);
    } catch (error) {
        console.error('Error presenting real estate item:', error);
        await ctx.reply('⚠️ Error displaying the real estate listing. Please try again later.');
    }
}

async function prepareMediaGroup(item: any): Promise<InputMediaPhoto[]> {
    const mapUrl = generateMapUrl(item.address.coords.lat, item.address.coords.lon);
    const mediaGroup: InputMediaPhoto[] = [{ type: 'photo', media: mapUrl }];

    const photoUrl = item.metaData?.coverImage;
    if (photoUrl) {
        mediaGroup.push({ type: 'photo', media: photoUrl });
    }

    return mediaGroup;
}

async function handleUserAction(ctx: MyContext, conversation: Conversation<MyContext>) {
    while (true) {
        const action = await conversation.wait();

        if (action.callbackQuery?.data === 'next') {
            await action.answerCallbackQuery();
            conversation.session.currentItemIndex = (conversation.session.currentItemIndex ?? 0) + 1;
            await presentRealEstateItem(ctx, conversation);
            break;
        } else if (action.message?.text === CANCEL_COMMAND) {
            await handleExit(ctx);
            return;
        } else {
            await ctx.reply('🤖 Please use the provided buttons or type /cancel to exit.');
        }
    }
}

async function handleExit(ctx: MyContext) {
    await ctx.reply('❌ Exiting real estate search.');
    if (ctx.conversation) {
        await ctx.conversation.exit();
    }
}