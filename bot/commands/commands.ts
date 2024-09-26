interface Commands {
    command: string;
    description: string;
}

export const COMMANDS: Commands[] = [
    { command: 'start', description: 'Start interacting with the bot' },
    { command: 'help', description: 'Show help text' },
    { command: 'davinci', description: 'Start conversation with davinci AI' },
    { command: 'real_estate', description: 'Find real-estate listing' },
    { command: 'cancel', description: 'Cancel conversation' },
];

