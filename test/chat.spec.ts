import "jest"
import Chat from '../src/chat';
import { CHAT_CONFIGURATIONS } from '../src/constants';

//Placeholder
describe('Chat JS', () => {
    beforeEach(() => {
        //Something
    });
    test('getActiveChats should be called', () => {
        expect(Chat.getActiveChats()).toBe(10);
    });
});
