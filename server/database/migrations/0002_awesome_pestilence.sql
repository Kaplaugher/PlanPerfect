PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_trips` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`chatId` text NOT NULL,
	`title` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`destination` text,
	`startDate` integer,
	`endDate` integer,
	`summary` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chatId`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_trips`("id", "userId", "chatId", "title", "status", "destination", "startDate", "endDate", "summary", "createdAt", "updatedAt") SELECT "id", "userId", "chatId", "title", "status", "destination", "startDate", "endDate", "summary", "createdAt", "updatedAt" FROM `trips`;--> statement-breakpoint
DROP TABLE `trips`;--> statement-breakpoint
ALTER TABLE `__new_trips` RENAME TO `trips`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `trips_chatId_unique` ON `trips` (`chatId`);--> statement-breakpoint
CREATE INDEX `tripUserIdIdx` ON `trips` (`userId`);--> statement-breakpoint
CREATE INDEX `tripChatIdIdx` ON `trips` (`chatId`);