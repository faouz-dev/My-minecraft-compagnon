# My Compagnon 1.1.1 🎮

A Minecraft Bedrock Edition addon that adds companion entities to follow, defend and assist you in your survival world.

## Features ✨

- **Companion Entities**: Spawn and manage companion NPCs that follow and defend you
- **Guard Behavior**: Companions can follow their owner, protect them from hostile mobs and attack selected targets
- **Needs Management**: Companions can sleep, eat and heal when necessary
- **Crop Farming**: Select a farming area, plant seeds, harvest mature crops and deposit items in a chest
- **Inventory Management**: Companions collect dropped items and automatically manage tools, armor and food
- **Command System**: Easy-to-use commands for spawning and managing companions
- **Event Handling**: Integrated event system for player and entity interactions
- **Data Management**: Persistent companion database to track your companions
- **Food Mob Support**: Special handling for food-related mobs and items
- **Custom Naming**: Rename your companion from the in-game menu
- **Debug Support**: Built-in debug logging for development and troubleshooting

## What's new in 1.1.1 🛠️

- Fixed the **Staff of Authority** selecting the block below or behind a chest instead of the chest itself.
- Block interactions now use the exact block targeted by Minecraft's item-use event.
- Companion targeting remains available through the same staff without relying on the block raycast.
- Added protection against the block and entity handlers processing the same click twice.

## Installation 📥

1. Download the latest `my-compagnon.mcaddon` file.
2. Double-click the `.mcaddon` file to import it into Minecraft Bedrock Edition.
3. Enable the addon in your world settings.
4. Ensure your Minecraft version is at least **1.26.30**.

## Requirements 📋

- **Minecraft Version**: 1.26.30 or higher
- **Edition**: Bedrock Edition
- **Script Modules**: Enabled in world settings

## Usage 🎯

### Commands

Run these commands in-game to use the addon:

- `/compagnon help` - Display all available commands
- `/compagnon spawn <type>` - Spawn a new companion
- `/compagnon behavior` - Configure companion behavior

The available behaviors include guard mode and crop farming. Use the in-game menu to select a behavior, rename your companion, select a farming area and choose a chest for storage.

### Staff of Authority

The Staff of Authority is the main interaction tool for the addon:

- Use it on your companion to open the companion menu.
- In crop-farming mode, use it on two blocks to delimit the farming area.
- In crop-farming mode, use it directly on a chest to select that exact chest as storage.
- Outside crop-farming mode, use it on a chest to ask the companion to empty its inventory there.

*Check the help command for a complete list of available options.*

- **Manifest Format**: 2
- **Pack Version**: 1.1.1
- **Minimum Engine Version**: 1.26.30
- **Script Language**: JavaScript

## Screenshots 📸

Gameplay screenshots are intentionally not embedded yet. Real in-game captures are preferred over generated mockups so the project page accurately represents the addon.

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author 👤

**Faouz-dev**
- GitHub: [@faouz-dev](https://github.com/faouz-dev)

## Contributing 🤝

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features

**Enjoy your companions in Minecraft Bedrock Edition! 🎮✨**
