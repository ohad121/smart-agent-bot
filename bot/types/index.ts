import { Context, SessionFlavor } from 'grammy';
import {
    type Conversation,
    type ConversationFlavor,
} from '@grammyjs/conversations';
import { RealEstateItem } from '../../api/real-estate/yad2.service';

interface SessionData {
    itemLevel: string;
    isDEGANft: boolean;
}

interface RealEstateData {
    realEstateItems?: RealEstateItem[];
    currentItemIndex?: number;
}

export type Session = SessionData & RealEstateData;


export type SessionContext = Context & SessionFlavor<Session>;
export type BotContext = SessionContext & ConversationFlavor;
export type ConversationContext = Conversation<BotContext>;
