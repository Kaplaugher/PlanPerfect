CREATE TABLE `trip_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`tripId` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`date` integer,
	`locationName` text,
	`latitude` real,
	`longitude` real,
	`type` text,
	`order` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`tripId`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activityTripIdIdx` ON `trip_activities` (`tripId`);--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`chatId` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
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
CREATE UNIQUE INDEX `trips_chatId_unique` ON `trips` (`chatId`);--> statement-breakpoint
CREATE INDEX `tripUserIdIdx` ON `trips` (`userId`);--> statement-breakpoint
CREATE INDEX `tripChatIdIdx` ON `trips` (`chatId`);