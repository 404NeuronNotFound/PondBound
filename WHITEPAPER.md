# PONDBOUND
## Game Design & Development Whitepaper
**Version 1.1 — Updated Technical Architecture**

---

# 1. Project Overview

## 1.1 Project Name
Pondbound

## 1.2 Game Concept

Pondbound is a cozy, top-down pixel-art fishing adventure featuring exploration, collection, progression, player-driven trading, and a dynamic virtual economy.

Players explore ponds, rivers, lakes, and hidden fishing locations to discover fish, collect materials, improve fishing rods, build aquariums, customize homes, and participate in a player-driven marketplace.

The game combines traditional RPG progression with a living economy where items have functional, collectible, and potentially historical value.

Pondbound must be enjoyable as a standalone game. Blockchain technology and the POND token are optional future extensions.

## 1.3 Core Design Philosophy

1. Gameplay comes before monetization.
2. Exploration and discovery should be rewarding.
3. Every fishing rod can be used, upgraded, traded, or collected.
4. The economy must be balanced and resistant to inflation.
5. Players must not be forced to play daily.
6. Rare items must have meaningful identity and history.
7. Game logic must be server-authoritative.
8. Blockchain functionality must remain optional.
9. Avoid pay-to-win mechanics.
10. Build cleanly in phases with maintainable code.

---

# 2. Core Gameplay Loop

1. Explore the world.
2. Select a fishing location.
3. Prepare a fishing rod and bait.
4. Cast the line.
5. Catch a fish.
6. Decide whether to sell, collect, trade, display, or preserve the fish.
7. Earn Gold and materials.
8. Upgrade equipment and improve the player's home.
9. Unlock new fishing locations.
10. Discover new fish and repeat.

Secondary gameplay loops:

- Rod enhancement and repair.
- Aquarium collection and customization.
- Fish market trading.
- NPC quests and contracts.
- Fish encyclopedia completion.
- Fishing tournaments.
- Seasonal and community events.
- Personal pond construction.

---

# 3. Visual Direction and Asset Production

## 3.1 Art Style

Pondbound uses an original cozy pixel-art aesthetic inspired by classic top-down RPGs and farming games.

Requirements:
- Top-down 3/4 perspective.
- Consistent pixel dimensions.
- Limited color palettes.
- Clear silhouettes.
- Transparent backgrounds for inventory items.
- Cohesive environmental tilesets.
- Pixel-perfect rendering.

The game must not directly copy copyrighted characters, sprites, maps, or assets from other games.

## 3.2 Asset Production Tool

Repository:

https://github.com/crsolver/claude-pxl

Use claude-pxl as the primary pixel-art source generation and sprite production toolkit.

The AI coding agent must inspect its README, examples, API, and build process before generating assets.

## 3.3 Initial Asset Pack

- Player fisherman.
- Idle animation.
- Four-direction walking animation.
- Basic fishing rod.
- Fishing bobber.
- Grass tiles.
- Water tiles.
- Pond edges.
- Sand and dirt tiles.
- Wooden dock.
- Basic fish sprites.
- Inventory icons.
- Initial pond environment.

---

# 4. Fishing System

## 4.1 Fishing Mechanics

Fishing must be interactive.

The fishing sequence:

1. Player equips a rod.
2. Player selects bait.
3. Player casts into a valid fishing area.
4. A bite occurs based on fishing parameters.
5. Player performs the fishing interaction.
6. A fish is caught or escapes.
7. Fish data is generated server-side.
8. Rod durability decreases.
9. Fish enters the player's inventory.

Fishing parameters:
- Location.
- Time of day.
- Weather.
- Season.
- Bait.
- Rod statistics.
- Fish species.
- Fish rarity.
- Fish size and weight.
- Catch difficulty.

All catch outcomes must be validated server-side.

## 4.2 Fish Rarity

Initial rarity tiers:

- Common
- Uncommon
- Rare
- Epic
- Legendary
- Mythical

Fish attributes:
- Species.
- Rarity.
- Weight.
- Size.
- Base market value.
- Habitat.
- Catch difficulty.
- Freshness.
- Mutation.
- Unique identifier.

## 4.3 Fish Mutations

Possible mutations:
- Golden.
- Albino.
- Shadow.
- Crystal.
- Ancient.

Mutations must have distinctive visual appearances and appropriately balanced rarity.

---

# 5. Fishing Rod System

## 5.1 Core Design

Every fishing rod is multifunctional.

A rod may be:
- Used for everyday fishing.
- Enhanced.
- Repaired.
- Sold.
- Collected.
- Displayed.
- Preserved as a collectible.

Do not create rigid categories separating everyday rods, collectible rods, and enhancement rods.

## 5.2 Rod Attributes

Each rod must have:
- Unique rod ID.
- Name.
- Rarity.
- Upgrade level.
- Maximum durability.
- Current durability.
- Fishing statistics.
- Special traits.
- Creation source.
- Owner.
- Upgrade history.
- Transaction history.

## 5.3 Rod Rarity

Common, Uncommon, Rare, Epic, Legendary, Mythical.

Higher rarity generally provides stronger statistics, greater maximum durability, and access to specialized abilities.

Rarity and enhancement level are separate attributes.

## 5.4 Rod Durability

Rods lose durability through fishing.

Example provisional values:

| Rarity | Maximum Durability |
|---|---:|
| Common | 100 |
| Uncommon | 150 |
| Rare | 220 |
| Epic | 320 |
| Legendary | 450 |
| Mythical | 600 |

When durability reaches zero, the rod breaks and is destroyed.

Repairs must be possible before a rod breaks.

## 5.5 Rod Enhancement

Enhancement requires three materials and a Gold fee.

Materials may be purchased from the marketplace, obtained through fishing, discovered in ponds, or crafted.

### Success
- Materials consumed.
- Gold fee consumed.
- Rod statistics increase.

### Failure
- Materials consumed.
- Gold fee consumed.
- Rod survives unchanged.

### Break
- Materials consumed.
- Gold fee consumed.
- Rod is permanently destroyed.

Provisional probabilities:

| Rarity | Success | Failure | Break |
|---|---:|---:|---:|
| Common | 90% | 9% | 1% |
| Uncommon | 85% | 12% | 3% |
| Rare | 75% | 20% | 5% |
| Epic | 65% | 25% | 10% |
| Legendary | 50% | 35% | 15% |
| Mythical | 40% | 40% | 20% |

Probabilities must be configurable and tested.

## 5.6 Enhancement Compensation

When a rod breaks, the player may receive basic bait, worms, or small Gold compensation.

Do not reward POND tokens for rod destruction.

## 5.7 Rod Collectibility

Each rod may maintain a permanent history:
- Original acquisition date.
- Original owner.
- Current owner.
- Number of fish caught.
- Highest fish rarity caught.
- Enhancement attempts.
- Successful enhancements.
- Previous owners.
- Event origin.
- Unique serial number.

Limited event rods and retired designs may become collectibles.

Never guarantee that a rod's market value will increase.

---

# 6. Fish Economy and Dynamic Market

## 6.1 Gold Currency

Gold is the primary gameplay currency.

Gold is earned through:
- NPC fish sales.
- Quests.
- Contracts.
- Events.
- Tournaments.
- Approved gameplay rewards.

Gold is used for:
- Fishing bait.
- Rod purchases.
- Rod repairs.
- Rod enhancement fees.
- Aquarium supplies.
- Home upgrades.
- Crafting.
- Fishing permits.
- Decorations.
- Marketplace fees.

## 6.2 Dynamic Supply and Demand

Fish market prices fluctuate based on actual market activity.

Price inputs:
- Completed trades.
- Available marketplace listings.
- Fish supply.
- Demand.
- Fish rarity.
- Freshness.
- Weight.
- Mutations.
- Seasonal events.

Completed transactions should have more influence than listing prices.

Private inventory holdings must not automatically count as market supply.

Use price smoothing, movement limits, price floors, and price ceilings.

## 6.3 NPC Fish Market

NPC merchants provide a stable baseline income.

NPC purchases should be approximately 90% of the reference market price under normal conditions.

NPC purchases must include quotas and diminishing returns.

Provisional example:

| Daily Sales | NPC Purchase Price |
|---|---:|
| First 10 fish | 90% reference price |
| Next 20 fish | 70% reference price |
| Next 50 fish | 45% reference price |
| Beyond quota | 20% reference price |

## 6.4 Player Marketplace

Players may trade eligible fish, rods, materials, and collectibles.

Marketplace requirements:
- Listing creation.
- Listing expiration.
- Purchase confirmation.
- Seller inventory validation.
- Buyer Gold validation.
- Transaction history.
- Marketplace fees.
- Anti-manipulation measures.

Player-to-player Gold transfers do not create new Gold.

Marketplace fees may permanently remove Gold from circulation.

---

# 7. Gold Inflation Control

## 7.1 Gold Sources

All Gold generation must be documented.

Examples:
- NPC fish sales.
- Quest rewards.
- Event rewards.
- Tournament rewards.
- Approved achievements.

Gold generation must be server-authoritative.

## 7.2 Gold Sinks

Gold sinks permanently remove Gold from circulation.

Primary sinks:
1. Rod repair.
2. Rod enhancement fees.
3. Bait purchases.
4. Fishing equipment.
5. Aquarium expansion.
6. Home customization.
7. Fishing permits.
8. NPC crafting fees.
9. Marketplace transaction fees.
10. Personal pond upgrades.

Gold sinks must be balanced against player income.

## 7.3 Economy Monitoring

Track:
- Total Gold created.
- Total Gold burned.
- Total Gold in circulation.
- Average Gold per active player.
- Median Gold per active player.
- Gold held by the richest 1%.
- NPC income.
- Marketplace volume.
- Gold spent on each sink.
- Fish market price movements.

The economy must be tested through simulated players before public release.

---

# 8. Fish Freshness

Fish lose freshness over time.

| State | Freshness | Value Multiplier |
|---|---:|---:|
| Fresh | 100–70% | 100% |
| Aging | 69–40% | 70% |
| Stale | 39–10% | 30% |
| Rotten | 0% | 0% |

These values are provisional.

Preservation options:
- Ice box.
- Refrigerator.
- Salt preservation.
- Aquarium for eligible live fish.

Players should not be heavily punished for being offline.

---

# 9. Aquarium and Home System

Players can own a home and construct aquariums.

Features:
- Aquarium placement.
- Fish display.
- Tank capacity.
- Decorations.
- Plants.
- Rocks.
- Water environment.
- Fish compatibility.
- Fish feeding.
- Aquarium upgrades.
- Home customization.

Aquariums must not become mandatory daily chores.

Food should last multiple days. Ordinary neglect must not permanently kill rare collectible fish.

## 9.1 Fish Breeding

Compatible fish may be bred.

Breeding may produce:
- New offspring.
- Different appearances.
- Mutations.
- Species discoveries.

Breeding must be controlled to prevent unlimited generation of rare tradable assets.

---

# 10. Multiplayer and Security

Pondbound must use server-authoritative game logic.

The client must never be trusted to determine:
- Fish catch results.
- Gold balances.
- Rod statistics.
- Upgrade probabilities.
- Item ownership.
- Market prices.
- Transaction outcomes.

Security requirements:
- Server-side validation.
- Atomic transactions.
- Inventory locking.
- Anti-duplication checks.
- Rate limits.
- Anti-bot detection.
- Marketplace fraud detection.
- Trade history.
- Database backups.
- Transaction logs.

The system must prevent duplicate item ownership and duplicate Gold generation.

---

# 11. Technical Architecture

## 11.1 Technology Stack

### Frontend
- React.
- TypeScript.
- Vite.
- Tailwind CSS.

### Game Engine
- Phaser 3.

### Backend
- NestJS.
- TypeScript.
- REST API.
- WebSockets for real-time features.

### Database and Backend Services
- Supabase PostgreSQL.
- Supabase Auth.
- Supabase Storage.
- Supabase Realtime where appropriate.

### ORM
- Prisma.

### Validation
- Zod for frontend/shared validation where appropriate.
- NestJS validation for backend request DTOs.

### Asset Production
- claude-pxl.
- PNG sprites.
- Sprite sheets.
- JSON animation metadata.

## 11.2 Architecture Overview

React is responsible for the user interface.

Phaser is responsible for the actual game rendering and gameplay presentation.

NestJS is responsible for authoritative game logic and server-side validation.

Supabase provides PostgreSQL database hosting, authentication, storage, and selected realtime services.

Prisma is used by NestJS to access PostgreSQL.

The frontend communicates with NestJS through REST APIs and WebSockets.

```text
Pondbound Frontend
├── React
├── TypeScript
├── Vite
├── Tailwind CSS
└── Phaser 3
        |
        | REST API / WebSockets
        |
Pondbound Backend
├── NestJS
├── Authentication
├── Fishing
├── Rods
├── Inventory
├── Economy
├── Marketplace
└── Game Validation
        |
        | Prisma
        |
Supabase
├── PostgreSQL
├── Authentication
├── Storage
└── Realtime
```

## 11.3 Security Architecture

NestJS must be the authoritative source for all gameplay decisions.

Supabase service-role credentials must never be exposed to the frontend.

The frontend must not directly modify:
- Gold balances.
- Rod statistics.
- Fish inventory.
- Enhancement outcomes.
- Market prices.
- Ownership records.

Supabase Row Level Security must be enabled for tables exposed through client-accessible Supabase APIs.

Game economy operations must use secure server-side transactions.

## 11.4 Recommended Project Structure

```text
pondbound/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── features/
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   ├── services/
│   │   │   └── game/
│   │   └── public/
│   │       └── assets/
│   │
│   └── api/
│       └── src/
│           ├── auth/
│           ├── players/
│           ├── fishing/
│           ├── fish/
│           ├── rods/
│           ├── inventory/
│           ├── economy/
│           ├── marketplace/
│           ├── npc/
│           ├── aquarium/
│           ├── quests/
│           ├── events/
│           ├── websocket/
│           └── admin/
│
├── packages/
│   ├── shared/
│   ├── game-config/
│   └── types/
│
├── art/
│   ├── palette/
│   ├── characters/
│   ├── fish/
│   ├── rods/
│   ├── tiles/
│   └── environments/
│
├── assets/
│   ├── sprites/
│   ├── tilesets/
│   └── animations/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── docs/
│   ├── WHITEPAPER.md
│   ├── GAME_DESIGN.md
│   ├── ECONOMY.md
│   └── ARCHITECTURE.md
│
└── package.json
```

The structure is a recommended monorepo layout. The AI agent may adjust it when necessary while preserving modularity and separation of concerns.

---

# 12. Development Phases

Every phase must be completed, tested, and reviewed before proceeding.

## PHASE 0 — Project Foundation

### Objective
Establish the development environment.

### Essential Tasks
- Inspect claude-pxl repository.
- Initialize React + TypeScript + Vite.
- Initialize NestJS.
- Configure Supabase.
- Configure PostgreSQL connection.
- Configure Prisma.
- Establish project repository structure.
- Configure environment variables.
- Establish coding conventions.
- Establish Git workflow.
- Create project documentation.

### Deliverables
- Running frontend.
- Running backend.
- Database connection.
- Basic project structure.
- Development documentation.

### Completion Criteria
Frontend and backend run locally without errors. Backend can connect to Supabase PostgreSQL through Prisma.

---

## PHASE 1 — Visual Foundation and World

### Objective
Create the first playable Pondbound environment.

### Essential Tasks
- Establish pixel-art palette.
- Create player sprite.
- Create player idle animation.
- Create four-direction movement.
- Create grass tiles.
- Create water tiles.
- Create pond edges.
- Create dock tiles.
- Create basic map.
- Integrate Phaser into React.
- Implement camera.
- Implement collision.
- Implement map rendering.

### Deliverables
- Playable character.
- Starter pond.
- Basic environmental tileset.
- Pixel-perfect rendering.

### Completion Criteria
Player can move around the starter pond and interact with the environment.

---

## PHASE 2 — Core Fishing Gameplay

### Objective
Implement the main gameplay loop.

### Essential Tasks
- Fishing rod equipment.
- Casting system.
- Fishing bobber.
- Bite detection.
- Fishing interaction.
- Fish catch results.
- Fish escape behavior.
- Fish inventory.
- Initial fish species.
- Initial rarity tiers.
- Basic rod durability.
- Server-side catch validation.

### Deliverables
- Functional fishing system.
- Fish inventory.
- Initial fish database.
- Basic rod equipment.

### Completion Criteria
Players can fish, catch species, and store fish in their inventory.

---

## PHASE 3 — Rod Progression

### Objective
Implement the complete rod lifecycle.

### Essential Tasks
- Rod rarity.
- Rod statistics.
- Rod durability.
- Rod repair.
- Three-material enhancement.
- Success, failure, and break outcomes.
- Enhancement probability configuration.
- Enhancement fees.
- Rod serial numbers.
- Rod history.
- Rod inventory.
- Rod trading eligibility.
- Rod display eligibility.

### Deliverables
- Fully functional rod system.
- Enhancement station.
- Rod repair system.
- Rod history.

### Completion Criteria
Players can obtain, use, repair, enhance, lose, trade, and collect rods.

---

## PHASE 4 — Gold Economy

### Objective
Establish a balanced in-game economy.

### Essential Tasks
- Gold wallet.
- NPC fish selling.
- NPC purchase quotas.
- Gold generation tracking.
- Gold sink tracking.
- Bait purchases.
- Rod repair fees.
- Enhancement fees.
- NPC merchant specializations.
- Gold transaction logs.
- Admin economy configuration.

### Deliverables
- Gold economy.
- NPC merchant system.
- Gold sinks.
- Economy analytics.

### Completion Criteria
Gold can be generated and spent securely. Every Gold source and sink is documented.

---

## PHASE 5 — Dynamic Fish Market

### Objective
Implement player-driven trading and market prices.

### Essential Tasks
- Marketplace listings.
- Fish trading.
- Material trading.
- Rod trading.
- Gold transfers.
- Market transaction history.
- Dynamic supply and demand.
- Price smoothing.
- Price floors and ceilings.
- Listing fees.
- Transaction fees.
- Anti-wash-trading detection.
- Trade validation.

### Deliverables
- Player marketplace.
- Dynamic market pricing.
- Secure trading system.

### Completion Criteria
Players can trade items securely and market prices respond to completed transactions.

---

## PHASE 6 — Aquarium and Home Progression

### Objective
Create long-term collection and customization gameplay.

### Essential Tasks
- Player home.
- Aquarium placement.
- Fish display.
- Tank capacity.
- Aquarium decorations.
- Fish feeding.
- Fish compatibility.
- Aquarium upgrades.
- Home customization.
- Fish preservation.
- Basic breeding system.

### Deliverables
- Player home.
- Aquarium system.
- Collection display.

### Completion Criteria
Players can collect fish, display them, and customize their home.

---

## PHASE 7 — Exploration and Content Expansion

### Objective
Expand the world and provide long-term progression.

### Essential Tasks
- Additional ponds.
- Rivers.
- Lakes.
- Hidden locations.
- Seasonal fish.
- Weather.
- Day/night fishing.
- NPC quests.
- Fishing contracts.
- Fish encyclopedia.
- Achievements.
- Tournaments.
- Rare mutations.
- Special fishing events.

### Deliverables
- Expanded world.
- Discovery progression.
- Quest system.
- Content progression.

### Completion Criteria
The game offers meaningful progression beyond repeatedly fishing at the starter pond.

---

## PHASE 8 — Multiplayer and Social Systems

### Objective
Enable community gameplay.

### Essential Tasks
- Multiplayer presence.
- Player interactions.
- Fishing parties.
- Shared fishing events.
- Chat.
- Trading enhancements.
- Leaderboards.
- Guilds.
- Community objectives.

### Deliverables
- Multiplayer functionality.
- Social features.
- Community events.

### Completion Criteria
Players can interact and participate in shared gameplay without compromising economy security.

---

## PHASE 9 — Economy Simulation and Balancing

### Objective
Validate the economy before public release.

### Essential Tasks
- Simulate 1,000 virtual players.
- Simulate 30-day economy.
- Simulate 90-day economy.
- Simulate 180-day economy.
- Test casual players.
- Test highly active players.
- Test market manipulation.
- Test Gold inflation.
- Test rod destruction frustration.
- Test fish price volatility.
- Test material scarcity.
- Test NPC Gold generation.
- Adjust economy parameters.

### Deliverables
- Economy simulation.
- Balance report.
- Adjusted configuration.

### Completion Criteria
No critical economy exploit remains. Gold generation and Gold sinks are sustainable.

---

## PHASE 10 — Optional Blockchain Integration

### Objective
Introduce optional blockchain functionality only after the game is stable.

### Essential Tasks
- Legal and regulatory review.
- Smart contract architecture.
- Wallet integration.
- Optional POND token.
- Eligible collectible asset integration.
- Marketplace integration.
- Smart contract security audit.
- Transaction monitoring.
- Token supply rules.
- Token burn implementation.

### Deliverables
- Optional blockchain functionality.
- Security documentation.
- Audited smart contracts.

### Completion Criteria
Blockchain integration is secure, legally reviewed, and does not compromise ordinary gameplay.

---

# 13. AI Coding Agent Instructions

## 13.1 Implementation Rules

- Read relevant documentation before coding.
- Inspect existing code before changing it.
- Do not rewrite working systems unnecessarily.
- Do not skip development phases.
- Do not implement future-phase systems prematurely.
- Use modular architecture.
- Prefer reusable components.
- Keep game balance values configurable.
- Avoid hardcoded economy logic.
- Validate all server-side actions.
- Write tests for important gameplay and economic logic.
- Document major architectural decisions.

## 13.2 Phase Execution

For each phase:

1. Explain the intended implementation.
2. Identify required files and modules.
3. Implement essential functionality.
4. Run tests.
5. Fix errors.
6. Review code quality.
7. Update documentation.
8. Confirm phase completion.

The agent must not claim a feature is complete without testing it.

## 13.3 Scope Control

Prioritize the smallest functional implementation of each phase.

Avoid:
- Unnecessary abstractions.
- Premature blockchain development.
- Excessive UI complexity.
- Unnecessary microservices.
- Overengineering.
- Implementing multiple unrelated systems simultaneously.

---

# 14. Final Project Vision

Pondbound should become a cozy fishing adventure with a living ecosystem and player-driven economy.

Players should enjoy the game even if they never trade, speculate, or interact with blockchain.

Fishing rods should be meaningful possessions. Fish should have ecological and economic value. Gold should support progression without becoming excessively inflated. Rare items should have identity, history, and collectibility.

The long-term vision is a world where players can explore, fish, collect, build, trade, and create their own stories.

**Immediate development priority: build a clean, playable fishing game using React, TypeScript, Phaser 3, NestJS, and Supabase. Everything else must grow from that foundation.**
