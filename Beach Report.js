// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: yellow; icon-glyph: umbrella-beach;

let beachName = args.widgetParameter || 'Hampton';
let beachReportUrl = 'https://www.epa.vic.gov.au/for-community/summer-water-quality/water-quality-across-victoria';

let beachData = await getBeachStuff(beachName);
let widget = await createWidget(beachData);
if (config.runsInWidget) {
	// The script runs inside a widget, so we pass our instance of ListWidget to be shown inside the widget on the Home Screen.
	Script.setWidget(widget);
} else {
	// The script runs inside the app, so we preview the widget.
	widget.presentSmall();
}
// Calling Script.complete() signals to Scriptable that the script have finished running.
// This can speed up the execution, in particular when running the script from Shortcuts or using Siri.
Script.complete();

async function getBeachStuff(beachString) {
	const wv = new WebView();

	await wv.loadURL(beachReportUrl);

	try {
		const result = await wv.evaluateJavaScript(
			`try {
				const today = {};
				const tomorrow = {};
				const row = Array.from(document.querySelectorAll('table.js-responsive-table tr')).find(node => node.textContent.includes('${beachString}'));
				today.quality = row.querySelector('td:nth-child(2) .indicator').innerText;
				today.description = row.querySelector('td:nth-child(2) p').innerText;
				tomorrow.quality = row.querySelector('td:nth-child(3) .indicator')?.innerText ?? 'not available';
				tomorrow.description = row.querySelector('td:nth-child(3) p')?.innerText ?? 'not available';
			
				let updated = Array.from(document.querySelectorAll('section.cm-yb-table p')).find(node => node.textContent.includes('Updated'));
				if (updated) {
					updated = updated.textContent;
				}
			
				completion({ today, tomorrow, updated });
			} catch (e) {
				logError(e);
			}`,
			true
		);

		console.log(result);
		return result;
	} catch (e) {
		console.error('Failed finding beach result', e);
	}
}

async function createWidget(beachData) {
	const { today, tomorrow, updated } = beachData;

	const headingColor = Color.blue();
	const textColor = Color.black();
	const lightColor = Color.gray();

	const CONDITION_COLORS = {
		Good: Color.green(),
		Fair: Color.yellow(),
		Poor: Color.red(),
		Illegal: Color.brown(),
	};

	const getConditionColor = condition => {
		return CONDITION_COLORS[condition] ?? textColor;
	};

	const textSize = config.widgetFamily === 'small' ? 18 : 20;

	let widget = new ListWidget();
	let mainStack = widget.addStack();
	mainStack.layoutVertically();

	let beachNameStack = mainStack.addStack();

	beachNameStack.layoutHorizontally();

	let beachSymbol = SFSymbol.named('beach.umbrella');
	let font = Font.systemFont(16);
	beachSymbol.applyFont(font);
	beachSymbol.applySemiboldWeight();
	let beachImage = beachNameStack.addImage(beachSymbol.image);
	beachImage.tintColor = headingColor;
	beachImage.resizable = false;

	beachNameStack.addSpacer(4);

	let beachNameText = beachNameStack.addText(beachName);
	beachNameText.textColor = headingColor;
	beachNameText.font = Font.boldRoundedSystemFont(16);

	mainStack.addSpacer(6);

	const currentYear = new Date().getFullYear();
	const updatedTrimmed = updated
		.replace('Updated', '')
		.replace('AEST', '')
		.replace(currentYear, '')
		.trim();
	let updatedText = mainStack.addText(`Updated: ${updatedTrimmed}`);
	updatedText.textColor = lightColor;
	updatedText.font = Font.semiboldSystemFont(10);

	mainStack.addSpacer();

	let daysStack = mainStack.addStack();
	daysStack.layoutHorizontally();

	let todayStack = daysStack.addStack();
	todayStack.layoutVertically();

	let todayTitleElement = todayStack.addText('TODAY');
	todayTitleElement.textColor = lightColor;
	todayTitleElement.font = Font.boldSystemFont(11);
	todayStack.addSpacer(4);

	let todayDescriptionElement = todayStack.addText(today.quality);
	todayDescriptionElement.minimumScaleFactor = 0.5;
	todayDescriptionElement.textColor = getConditionColor(today.quality);
	todayDescriptionElement.font = Font.semiboldRoundedSystemFont(textSize);

	daysStack.addSpacer();

	let tomorrowStack = daysStack.addStack();
	tomorrowStack.layoutVertically();

	let tomorrowTitleElement = tomorrowStack.addText('TOMORROW');
	tomorrowTitleElement.textColor = lightColor;
	tomorrowTitleElement.font = Font.boldSystemFont(11);
	tomorrowStack.addSpacer(4);

	let tomorrowDescriptionElement = tomorrowStack.addText(tomorrow.quality);
	tomorrowDescriptionElement.minimumScaleFactor = 0.5;
	tomorrowDescriptionElement.textColor = getConditionColor(tomorrow.quality);
	tomorrowDescriptionElement.font = Font.semiboldRoundedSystemFont(textSize);

	return widget;
}
