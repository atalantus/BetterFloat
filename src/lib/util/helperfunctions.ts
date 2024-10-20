import { AcidFadeCalculator, AmberFadeCalculator, FadeCalculator } from 'csgo-fade-percentage-calculator';
import Decimal from 'decimal.js';
import type { DopplerPhase, ItemStyle } from '../@typings/FloatTypes';
import { getPriceMapping } from '../handlers/mappinghandler';
import { MarketSource } from './globals';
import { phaseMapping } from './patterns';

export function getFadePercentage(weapon: string, skin: string, paintSeed: number) {
	if (skin.includes('Amber Fade')) {
		return { ...AmberFadeCalculator.getFadePercentage(weapon, paintSeed), background: 'linear-gradient(to right,#627d66,#896944,#3b2814)' };
	}
	if (skin.includes('Acid Fade')) {
		return { ...AcidFadeCalculator.getFadePercentage(weapon, paintSeed), background: 'linear-gradient(to right,#6d5f55,#76c788, #574828)' };
	}
	if (skin.includes('Kukri Knife | Fade')) {
		return { ...FadeCalculator.getFadePercentage('Kukri Knife', paintSeed), background: 'linear-gradient(to right,#d9bba5,#e5903b,#db5977,#6775e1)' };
	}
	if (skin.includes('M4A1-S | Fade')) {
		return { ...FadeCalculator.getFadePercentage('M4A1-S', paintSeed), background: 'linear-gradient(to right,#d9bba5,#e5903b,#db5977,#6775e1)' };
	}
	return null;
}

export function getBuffLink(buff_id: number, phase?: DopplerPhase | null) {
	const baseUrl = `https://buff.163.com/goods/${buff_id}`;
	if (phase) {
		return `${baseUrl}#tag_ids=${phaseMapping[buff_id][phase]}`;
	}
	return baseUrl;
}

export async function formFetch<T>(url: string, body: string): Promise<T> {
	return fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: encodeURI(body),
	}).then((response) => response.json() as Promise<T>);
}

export async function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

type WaitElementOptions = {
	interval?: number;
	maxTries?: number;
};
/**
 * Wait of an element to appear in the DOM
 * @param selector css selector for the element
 * @param interval interval in ms, default 200
 * @param maxTries maximum tries, default 10
 * @returns true if element was found, false if not
 */
export async function waitForElement(selector: string, { interval = 200, maxTries = 10 }: WaitElementOptions = { interval: 200, maxTries: 10 }) {
	let tries = 0;
	while (!document.querySelector(selector) && tries < maxTries) {
		tries++;
		await new Promise((r) => setTimeout(r, interval));
	}
	return tries < maxTries;
}

/**
 * Listens for url changes and executes the callback function
 * @param urlChangeCallback callback function
 * @param delay interval in ms, default 2000
 * @returns interval id for use with clearInterval
 * @async setInterval executed every 200ms
 */
export function createUrlListener(urlChangeCallback: (newUrl: string) => void, delay = 2000) {
	// current url, automically updated per interval
	let currentUrl: string = location.href;
	return setInterval(() => {
		const newUrl = location.href;
		if (currentUrl !== newUrl) {
			currentUrl = newUrl;
			urlChangeCallback(newUrl);
		}
	}, delay);
}

/**
 * Buff regulated items are not allowed to be sold on Buff. This function checks if an item is banned.
 * @param name
 * @returns
 */
export function isBuffBannedItem(name: string) {
	const bannedItems = ['2020 RMR Legends', '2020 RMR Contenders', '2020 RMR Challengers'];
	return (!name.includes('Case Hardened') && name.includes('Case')) || name.includes('Capsule') || name.includes('Package') || name.includes('Patch Pack') || bannedItems.includes(name);
}

export function getMarketURL({ source, buff_name, market_id = 0, phase }: { source: MarketSource; buff_name: string; market_id?: number | string; phase?: DopplerPhase }) {
	switch (source) {
		case MarketSource.Buff: {
			if (Number(market_id) === 0) {
				return `https://buff.163.com/market/csgo#tab=selling&page_num=1&search=${encodeURIComponent(buff_name)}`;
			}
			return `https://buff.163.com/goods/${market_id}${phase ? `#tag_ids=${phaseMapping[market_id][phase]}` : ''}`;
		}
		case MarketSource.Steam:
			return `https://steamcommunity.com/market/listings/730/${encodeURIComponent(buff_name)}`;
		case MarketSource.YouPin:
			if (Number(market_id) > 0) {
				return `https://youpin898.com/goodInfo?id=${market_id}`;
			}
			return `https://youpin898.com/market/csgo?gameId=730&search=${encodeURIComponent(buff_name)}`;
		case MarketSource.C5Game: {
			if (market_id && market_id !== -1) {
				return `https://www.c5game.com/en/csgo/${market_id}/${encodeURIComponent(buff_name.split(' (')[0])}/sell`;
			} else {
				return `https://www.c5game.com/en/csgo?marketKeyword=${encodeURIComponent(buff_name)}`;
			}
		}
	}
	return '';
}

/**
 * Wrapper for price mapping. Returns the price of an item with respect to its style
 * @param buff_name has to follow the exact Buff's naming convention.
 * @param itemStyle e.g. Vanilla, Phase 1, Phase 2, ...
 * @returns
 */
export async function getBuffPrice(buff_name: string, itemStyle: ItemStyle, source: MarketSource = MarketSource.Buff) {
	let queryName = buff_name;

	if (source === MarketSource.Buff && itemStyle !== '' && itemStyle !== 'Vanilla') {
		queryName = buff_name + ' - ' + itemStyle;
	}

	const values: {
		priceListing?: Decimal;
		priceOrder?: Decimal;
		priceAvg30?: Decimal;
		liquidity?: Decimal;
		count?: Decimal;
	} = {};
	const priceMapping = await getPriceMapping(source);

	if (priceMapping[queryName]) {
		const result = priceMapping[queryName];

		if (result['bid'] !== undefined) {
			values.priceOrder = new Decimal(priceMapping[queryName]['bid'] ?? 0).div(100);
		}
		if (result['ask'] !== undefined) {
			values.priceListing = new Decimal(priceMapping[queryName]['ask'] ?? 0).div(100);
		} else if (result['price'] !== undefined) {
			values.priceListing = new Decimal(priceMapping[queryName]['price'] ?? 0).div(100);
		}
		if (result['avg30'] !== undefined) {
			values.priceAvg30 = new Decimal(priceMapping[queryName]['avg30'] ?? 0).div(100);
		}
		if (result['liquidity'] !== undefined) {
			values.liquidity = new Decimal(priceMapping[queryName]['liquidity'] ?? 0);
		}
		if (result['count'] !== undefined) {
			values.count = new Decimal(priceMapping[queryName]['count'] ?? 0);
		}
	} else {
		console.debug(`[BetterFloat] No price mapping found for ${buff_name}`);
	}

	return values;
}

// truncats a number to a given amount of digits
export function toTruncatedString(num: number, digits: number) {
	const regex = new RegExp(`^-?\\d+(?:\\.\\d{0,${digits}})?`).exec(num.toString());
	return regex ? regex[0] : '';
}

/**
 * Convert a string to title case
 * @param str
 * @returns
 */
export function toTitleCase(str: string) {
	const splitStr = str.toLowerCase().split(' ');
	for (let i = 0; i < splitStr.length; i++) {
		splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
	}
	return splitStr.join(' ');
}

/**
 * get the time difference between now and the creation of the listing
 * @param created_at example format: "2023-10-12T11:06:15"
 */
export function calculateTime(created_at: string, timeOffset = 0) {
	const timeDiff = (strDate: string) => {
		const now = new Date();
		const diff = now.getTime() - Date.parse(strDate) - timeOffset * 60 * 60_000;
		return Math.floor(diff / 60_000);
	};
	const timeMin = timeDiff(created_at);
	const timeHours = Math.floor(timeMin / 60);
	let textTime = '';
	if (timeHours < 49) {
		if (timeMin < 120) {
			textTime = `${timeMin} minute${timeMin === 1 ? '' : 's'} ago`;
		} else {
			textTime = `${timeHours} hour${timeHours === 1 ? '' : 's'} ago`;
		}
	} else {
		textTime = `${Math.floor(timeHours / 24)} day${Math.floor(timeHours / 24) === 1 ? '' : 's'} ago`;
	}
	return textTime;
}

export function getSPBackgroundColor(spPercentage: number) {
	if (spPercentage < 0.005 || spPercentage > 2) {
		return '#0003';
	}
	if (spPercentage >= 1) {
		return 'rgb(245 0 0 / 40%)';
	}
	if (spPercentage > 0.5) {
		return 'rgb(245 164 0 / 40%)';
	}
	if (spPercentage > 0.25) {
		return 'rgb(244 245 0 / 40%)';
	}
	return 'rgb(83 245 0 / 40%)';
}

export function handleSpecialStickerNames(name: string): string {
	if (name.includes('Ninjas in Pyjamas | Katowice 2015')) {
		return 'Sticker | Ninjas in Pyjamas  | Katowice 2015';
	} else if (name.includes('Vox Eminor | Katowice 2015')) {
		return 'Sticker | Vox Eminor  | Katowice 2015';
	} else if (name.includes('PENTA Sports | Katowice 2015')) {
		return 'Sticker | PENTA Sports  | Katowice 2015';
	} else if (name.includes('Ground Rebel | Elite Crew')) {
		return 'Ground Rebel  | Elite Crew';
	} else if (name.includes('Michael Syfers | FBI Sniper')) {
		return 'Michael Syfers  | FBI Sniper';
	} else if (name.indexOf('niko') > -1) {
		return name.substring(0, name.lastIndexOf('|')) + ' ' + name.substring(name.lastIndexOf('|'), name.length);
	}
	return name;
}

/**
 * Get a coloring for the float value of an item
 * @param w wear value
 * @param l low: lower float bound
 * @param h high: upper float bound
 * @param isVanilla if the item is a vanilla
 * @returns
 */
export function getFloatColoring(w: number, l = 0, h = 1, isVanilla = false): string {
	const colors = {
		good: 'turquoise',
		bad: 'indianred',
		perfect: 'springgreen',
		worst: 'orangered',
		normal: '',
	};

	// special ranges for vanilla knives
	if (isVanilla) {
		if (w < 0.07) {
			return colors.perfect;
		} else if (w < 0.1) {
			return colors.good;
		} else if (w >= 0.79) {
			return colors.worst;
		} else if (w >= 0.75) {
			return colors.bad;
		}
		return colors.normal;
	}

	const wearRanges = [
		{ low: 0, high: 0.07 },
		{ low: 0.07, high: 0.15 },
		{ low: 0.15, high: 0.38 },
		{ low: 0.38, high: 0.45 },
		{ low: 0.45, high: 1 },
	];
	const actualRanges = wearRanges.filter((range) => l < range.low && h > range.high);
	actualRanges.push({ low: actualRanges[actualRanges.length - 1]?.high ?? 0.07, high: h });
	actualRanges.push({ low: l, high: actualRanges[0]?.low ?? 0.07 });
	// we need >= as Skinport cuts off digits
	const range = actualRanges.find((range) => w >= range.low && w < range.high)!;
	if (w - range.low < 0.001 && l === range.low) {
		return colors.perfect;
	} else if (
		(w - range.low < 0.01 && range.high > w + 0.03) ||
		(range.low === 0.15 && w >= 0.15 && w < 0.18 && range.high > 0.3) ||
		(range.low === 0.45 && w >= 0.45 && w < 0.5 && range.high > 0.55)
	) {
		return colors.good;
	} else if (range.high - w < 0.001 && h === range.high) {
		return colors.worst;
	} else if (range.high - w < 0.01 || (range.high === 0.38 && w > 0.32 && w < 0.38 && range.low < 0.22) || w > 0.9) {
		return colors.bad;
	}
	return colors.normal;
}

export const USDollar = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	currencyDisplay: 'narrowSymbol',
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
});

export const BigUSDollar = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	currencyDisplay: 'narrowSymbol',
	minimumFractionDigits: 0,
	maximumFractionDigits: 0,
});

export const Euro = new Intl.NumberFormat('en-DE', {
	style: 'currency',
	currency: 'EUR',
	currencyDisplay: 'narrowSymbol',
});

export function convertCurrency(amount: number, currency: string) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency,
		currencyDisplay: 'narrowSymbol',
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(amount);
}
