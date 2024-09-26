import { BotContext, ConversationContext } from '../types';
import { handleRealEstateCommand, generateMapUrl } from '../../api/real-estate/real-estate-handler';

const realestateConversation = async (
    conversation: ConversationContext,
    ctx: BotContext
) => {
    do {
        await ctx.reply('Please describe the real estate you are looking for, or type /cancel to exit.');

        const { message } = await conversation.wait();

        if (isCancel(message?.text || '')) {
            await ctx.reply('Exiting real estate search.');
            await ctx.conversation.exit();
            return;
        }

        const userInput = message?.text || '';

        try {
            const { realEstateItems, queryParams } = await handleRealEstateCommand(userInput);

            const searchUrl = queryParams.searchUrl;
            const listingsCount = realEstateItems.length;

            if (listingsCount === 0) {
                await ctx.reply(`No real estate listings found for your criteria.\nSearch URL: ${searchUrl}`);
            } else {
                await ctx.reply(`${listingsCount} listings found.\nSearch URL: ${searchUrl}`);
                ctx.session.realEstateItems = realEstateItems;
                ctx.session.currentItemIndex = 0;
                await presentRealEstateItem(ctx);
            }
        } catch (error) {
            await ctx.reply('An error occurred while processing your request. Please try again later.');
        }

    } while (true);
};

export const isCancel = (message: string) => {
    return message === '/cancel';
};

async function presentRealEstateItem(ctx: BotContext) {
    try {
        const index = ctx.session.currentItemIndex ?? 0;
        const items = ctx.session.realEstateItems ?? [];

        if (index >= items.length) {
            await ctx.reply('No more listings available.');
            return;
        }

        const item = items[index];
        if (item) {
            let text = `Property: ${item.additionalDetails.property.text}\n`;
            text += `City: ${item.address.city.text}\n`;

            if (item.address.neighborhood) {
                text += `Neighborhood: ${item.address.neighborhood.text}\n`;
            }

            if (item.address.street) {
                text += `Street: ${item.address.street.text}`;
                if (item.address.house) {
                    text += ` ${item.address.house.number}`;
                }
                text += `\n`;
            }

            if (item.address.house) {
                text += `Floor: ${item.address.house.floor}\n`;
            }

            text += `Price: ${item.price.toLocaleString()} ₪\n`;
            text += `Rooms: ${item.additionalDetails.roomsCount}\n`;
            text += `Square Meters: ${item.additionalDetails.squareMeter} m²\n`;
            text += `Listing ${index + 1} of ${items.length}\n`;

            const mapUrl = generateMapUrl(
                item.address.coords.lat,
                item.address.coords.lon
            );
            const photoUrl = item.metaData.coverImage;

            await ctx.replyWithMediaGroup([
                { type: 'photo', media: mapUrl },
                { type: 'photo', media: photoUrl },
            ]);
            await ctx.reply(text, {
                parse_mode: 'HTML',
            });

            ctx.session.currentItemIndex = index + 1;
        }
    } catch (error) {
        console.error('Error presenting real estate item:', error);
        await ctx.reply(
            'Error displaying the real estate listing. Please try again later.'
        );
    }
}

export { realestateConversation };
