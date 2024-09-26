import { env } from 'node:process';
import { InlineKeyboard, InputMediaBuilder } from 'grammy';
import { html as format } from 'telegram-format';
import { Yad2RealEstateService, } from './yad2.service.js';
import { config as dotenv } from 'dotenv';
dotenv();
const googleMapsApiKey = env['GOOGLE_MAPS_API_KEY'] ?? '';
if (!googleMapsApiKey) {
    throw new Error('You have to provide the Google Maps API key via environment variable (GOOGLE_MAPS_API_KEY)');
}
const realEstateService = new Yad2RealEstateService();
export async function handleRealEstateCommand(ctx) {
    try {
        const queryParams = {
            maxPrice: 2000000,
            minRooms: 3,
            maxRooms: 3,
            imageOnly: 1,
            property: '1,3,6,7,25,49,51,11,4',
            topArea: 2,
            area: 11,
            city: 6200,
        };
        const realEstateItems = await realEstateService.fetchRealEstateData(queryParams);
        if (realEstateItems.length === 0) {
            await ctx.reply('No real estate listings found for your criteria.');
            return;
        }
        ctx.session.realEstateItems = realEstateItems;
        ctx.session.currentItemIndex = 0;
        await presentRealEstateItem(ctx);
    }
    catch (error) {
        console.error('Error fetching real estate data:', error);
        await ctx.reply('There was an error fetching real estate data. Please try again later.');
    }
}
export async function presentRealEstateItem(ctx) {
    try {
        const index = ctx.session.currentItemIndex ?? 0;
        const items = ctx.session.realEstateItems ?? [];
        console.log(`Presenting item ${index + 1} of ${items.length}`);
        if (index >= items.length) {
            console.log('No more listings available');
            await ctx.reply('No more listings available.');
            return;
        }
        const item = items[index];
        if (item) {
            let text = `${format.bold('Property:')} ${item.additionalDetails.property.text}\n`;
            text += `${format.bold('City:')} ${item.address.city.text}\n`;
            if (item.address.neighborhood) {
                text += `${format.bold('Neighborhood:')} ${item.address.neighborhood.text}\n`;
            }
            if (item.address.street) {
                text += `${format.bold('Street:')} ${item.address.street.text}`;
                if (item.address.house) {
                    text += ` ${item.address.house.number}`;
                }
                text += `\n`;
            }
            if (item.address.house) {
                text += `${format.bold('Floor:')} ${item.address.house.floor}\n`;
            }
            text += `${format.bold('Price:')} ${item.price.toLocaleString()} ₪\n`;
            text += `${format.bold('Rooms:')} ${item.additionalDetails.roomsCount}\n`;
            text += `${format.bold('Square Meters:')} ${item.additionalDetails.squareMeter} m²\n`;
            text += `Listing ${index + 1} of ${items.length}\n`;
            const mapUrl = generateMapUrl(item.address.coords.lat, item.address.coords.lon);
            const photoUrl = item.metaData.coverImage;
            const keyboard = new InlineKeyboard()
                .text('👍 Like', 'like')
                .text('👎 Not Like', 'dislike')
                .row()
                .url('View Listing', `https://www.yad2.co.il/realestate/item/${item.token}`);
            await ctx.replyWithMediaGroup([
                InputMediaBuilder.photo(mapUrl),
                InputMediaBuilder.photo(photoUrl),
            ]);
            await ctx.reply(text, {
                parse_mode: format.parse_mode,
                reply_markup: keyboard,
            });
            console.log('Presented real estate item:', item.token);
        }
    }
    catch (error) {
        console.error('Error presenting real estate item:', error);
        await ctx.reply('Error displaying the real estate listing. Please try again later.');
    }
}
export async function handleLike(ctx) {
    try {
        if (!ctx.callbackQuery)
            throw new Error('callbackQuery is undefined');
        const originalText = ctx.callbackQuery.message?.text ?? '';
        const updatedText = `${originalText}\n\nYou liked this listing 👍`;
        ctx.session.currentItemIndex = (ctx.session.currentItemIndex ?? 0) + 1;
        await ctx.editMessageText(updatedText, {
            parse_mode: format.parse_mode,
        });
        await presentRealEstateItem(ctx);
    }
    catch (error) {
        console.error('Error handling like action:', error);
        await ctx.reply('Failed to process your like. Please try again.');
    }
}
export async function handleDislike(ctx) {
    try {
        if (!ctx.callbackQuery)
            throw new Error('callbackQuery is undefined');
        const originalText = ctx.callbackQuery.message?.text ?? '';
        const updatedText = `${originalText}\n\nYou disliked this listing 👎`;
        ctx.session.currentItemIndex = (ctx.session.currentItemIndex ?? 0) + 1;
        await ctx.editMessageText(updatedText, {
            parse_mode: format.parse_mode,
        });
        await presentRealEstateItem(ctx);
    }
    catch (error) {
        console.error('Error handling dislike action:', error);
        await ctx.reply('Failed to process your dislike. Please try again.');
    }
}
function generateMapUrl(lat, lon) {
    const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    const center = `${lat},${lon}`;
    const zoom = 15;
    const size = '600x400';
    const marker = `color:red|${lat},${lon}`;
    return `${baseUrl}?&center=${center}&format=jpg&zoom=${zoom}&size=${size}&markers=${marker}&key=${googleMapsApiKey}`;
}
