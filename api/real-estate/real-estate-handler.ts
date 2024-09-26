import { env } from 'node:process';
import { Yad2RealEstateService } from './yad2.service.js';
import { config as dotenv } from 'dotenv';
import { createCompletion } from '../../api';
import {
	FREQUENCY_PENALTY,
	MAX_TOKENS,
	PRESENCE_PENALTY,
	TEMPERATURE,
	TOP_P,
} from '../../constants';
import OpenAI from 'openai';
import ChatCompletionCreateParams = OpenAI.ChatCompletionCreateParams;

dotenv();
const googleMapsApiKey = env['GOOGLE_MAPS_API_KEY'] ?? '';

if (!googleMapsApiKey) {
	throw new Error(
		'You have to provide the Google Maps API key via environment variable (GOOGLE_MAPS_API_KEY)'
	);
}

const realEstateService = new Yad2RealEstateService();

type RealEstateOpenAiResponseParams = {
	category: 'rent' | 'forsale';
	minPrice?: number;
	maxPrice?: number;
	minRooms?: number;
	maxRooms?: number;
	minFloor?: number;
	maxFloor?: number;
	minSquareMeter?: number;
	maxSquareMeter?: number;
	imageOnly?: boolean;
	priceOnly?: boolean;
	settlements?: boolean;
	priceDropped?: boolean;
	brokerage?: boolean;
	newFromContractor?: boolean;
	property?: string;
	parking?: boolean;
	elevator?: boolean;
	airConditioner?: boolean;
	balcony?: boolean;
	shelter?: boolean;
	bars?: boolean;
	warehouse?: boolean;
	accessibility?: boolean;
	renovated?: boolean;
	furniture?: boolean;
	assetExclusive?: boolean;
	topArea?: number;
	area?: number;
	city?: number;
	propertyCondition?: string;
	searchUrl: string;
	apiUrl: string;
};

const realEstateQuerySchema = {
	name: 'RealEstateQuerySchema',
	description: 'Schema to structure the real estate query parameters.',
	type: 'object',
	properties: {
		category: {
			type: 'string',
			enum: ['rent', 'forsale'],
			description: 'Category of the real estate listing, either "rent" or "forsale". Example: "forsale"',
		},
		minPrice: { type: ['number', 'null'], description: 'Minimum price. Example: 1000000' },
		maxPrice: { type: ['number', 'null'], description: 'Maximum price. Example: 3000000' },
		minRooms: { type: ['number', 'null'], description: 'Minimum number of rooms. Example: 2' },
		maxRooms: { type: ['number', 'null'], description: 'Maximum number of rooms. Example: 5' },
		minFloor: { type: ['number', 'null'], description: 'Minimum floor level. Example: 1' },
		maxFloor: { type: ['number', 'null'], description: 'Maximum floor level. Example: 10' },
		minSquareMeter: { type: ['number', 'null'], description: 'Minimum square meters. Example: 60' },
		maxSquareMeter: { type: ['number', 'null'], description: 'Maximum square meters. Example: 150' },
		imageOnly: { type: ['boolean', 'null'], description: 'Include only listings with images (1 for true). Example: 1' },
		priceOnly: { type: ['boolean', 'null'], description: 'Include only listings with prices (1 for true). Example: 1' },
		settlements: { type: ['boolean', 'null'], description: 'Filter for specific settlement areas (1 for true). Example: 1' },
		priceDropped: { type: ['boolean', 'null'], description: 'Include only listings where the price has dropped (1 for true). Example: 1' },
		brokerage: { type: ['boolean', 'null'], description: 'Include listings that involve brokerage (1 for true). Example: 1' },
		newFromContractor: { type: ['boolean', 'null'], description: 'Include new properties from contractors (1 for true). Example: 1' },
		property: {
			type: ['string', 'null'],
			description: 'Comma-separated list of property type IDs as a string. Example: "1,3,5"',
		},
		parking: { type: ['boolean', 'null'], description: 'Include listings with parking (1 for true). Example: 1' },
		elevator: { type: ['boolean', 'null'], description: 'Include listings with an elevator (1 for true). Example: 1' },
		airConditioner: { type: ['boolean', 'null'], description: 'Include listings with air conditioning (1 for true). Example: 1' },
		balcony: { type: ['boolean', 'null'], description: 'Include listings with a balcony (1 for true). Example: 1' },
		shelter: { type: ['boolean', 'null'], description: 'Include listings with a shelter (1 for true). Example: 1' },
		bars: { type: ['boolean', 'null'], description: 'Include listings with bars on windows (1 for true). Example: 1' },
		warehouse: { type: ['boolean', 'null'], description: 'Include listings with a warehouse (1 for true). Example: 1' },
		accessibility: { type: ['boolean', 'null'], description: 'Include accessible listings (1 for true). Example: 1' },
		renovated: { type: ['boolean', 'null'], description: 'Include renovated listings (1 for true). Example: 1' },
		furniture: { type: ['boolean', 'null'], description: 'Include furnished listings (1 for true). Example: 1' },
		assetExclusive: { type: ['boolean', 'null'], description: 'Include exclusive listings (1 for true). Example: 1' },
		topArea: { type: ['number', 'null'], description: 'Filter by top area code. Example: 1' },
		area: { type: ['number', 'null'], description: 'Filter by area code. Example: 2' },
		city: {
			type: ['number', 'null'],
			description: 'Filter by city code. Example: 5000 (Tel Aviv-Yafo)',
		},
		subcategory: {
			type: 'string',
			enum: ['forsale', 'rent'],
			description: 'Subcategory of the listing, either "forsale" or "rent". Example: "forsale"',
		},
		propertyCondition: {
			type: ['string', 'null'],
			description: 'Comma-separated list of property condition IDs as a string. Example: "1,2"',
		},
		searchUrl: {
			type: 'string',
			description: 'Generated search URL based on the input parameters. Format: "https://www.yad2.co.il/realestate/{category}?single-value-param=value&multiple-value-param=value1,value2&range-value-param=minvalue-maxvalue&text=keywords". Example: "https://www.yad2.co.il/realestate/forsale?city=5000&property=1,3,5&minPrice=1000000&maxPrice=3000000&minRooms=2&maxRooms=5"',
		},
		apiUrl: {
			type: 'string',
			description: 'Generated API URL for fetching the real estate data. Format: "https://gw.yad2.co.il/realestate-feed/{category}/map?single-value-param=value&multiple-value-param=value1,value2&range-value-param=minvalue-maxvalue&text=keywords". Example: "https://gw.yad2.co.il/realestate-feed/forsale/map?city=5000&property=1,3,5&minPrice=1000000&maxPrice=3000000&minRooms=2&maxRooms=5"',
		},
	},
	required: [
		'category',
		'minPrice',
		'maxPrice',
		'minRooms',
		'maxRooms',
		'minFloor',
		'maxFloor',
		'minSquareMeter',
		'maxSquareMeter',
		'imageOnly',
		'priceOnly',
		'settlements',
		'priceDropped',
		'brokerage',
		'newFromContractor',
		'property',
		'parking',
		'elevator',
		'airConditioner',
		'balcony',
		'shelter',
		'bars',
		'warehouse',
		'accessibility',
		'renovated',
		'furniture',
		'assetExclusive',
		'topArea',
		'area',
		'city',
		'propertyCondition',
		'subcategory',
		'searchUrl',
		'apiUrl',
	],
	additionalProperties: false,
};

export async function handleRealEstateCommand(userInput: string) {
	try {
		const prompt = `
You are a real estate query generator. Given the following user input, generate a JSON object that conforms to the schema provided below. The JSON object should include all necessary parameters based on the provided data. For each field in the schema, provide an explanation and an example. Ensure that fields like 'property', which require a comma-separated list of numeric IDs as a string, are handled correctly.

**Special Instructions:**

- If the user is searching for 'parking' (חניה) and does not specify 'rent' or 'forsale', default the **category** to **'rent'**.

- When the user specifies 'parking' (חניה) as the main property type they are looking for, set the **property** field to **'30'**, which corresponds to 'Parking'.

- Do not misinterpret 'parking' as a feature of an apartment; treat it as the property type if it's clear from the context.

Additionally, generate URLs for both the search and the API using the following formats:

- **searchUrl**: 
  - **Format**: "BASE: https://www.yad2.co.il/realestate/ THEN: {category}?single-value-param=value&multiple-value-param=value1,value2&range-value-param=minvalue-maxvalue&text=keywords".
  - **Example**: "https://www.yad2.co.il/realestate/forsale?city=5000&property=1,3,5&minPrice=1000000&maxPrice=3000000&minRooms=2&maxRooms=5"

- **apiUrl**: 
  - **Format**: "BASE: https://gw.yad2.co.il/realestate-feed/ THEN: {category}/map?single-value-param=value&multiple-value-param=value1,value2&range-value-param=minvalue-maxvalue&text=keywords".
  - **Example**: "https://gw.yad2.co.il/realestate-feed/forsale/map?city=5000&property=1,3,5&minPrice=1000000&maxPrice=3000000&minRooms=2&maxRooms=5"

**Pay close attention to the URLs:**

- **Do not change the order of the path parameters**; only modify the query parameters based on the input.
- When including parameters like 'property' or 'propertyCondition', which are strings of comma-separated values, ensure they are correctly formatted in the URLs.
- Ensure that all query parameters are correctly appended to the URLs with the appropriate parameter names.
- **Do not include undefined or null parameters** in the URLs.

### Schema:

- **category**: Category of the real estate listing, either "rent" or "forsale" (string).
  - **Explanation**: Determines the type of listings to search for.
  - **Example**: "forsale"

- **minPrice**: Minimum price (number).
  - **Explanation**: The lowest price in the price range.
  - **Example**: 1000000

- **maxPrice**: Maximum price (number).
  - **Explanation**: The highest price in the price range.
  - **Example**: 3000000

- **minRooms**: Minimum number of rooms (number).
  - **Explanation**: The least number of rooms required.
  - **Example**: 2

- **maxRooms**: Maximum number of rooms (number).
  - **Explanation**: The maximum number of rooms desired.
  - **Example**: 5

- **minFloor**: Minimum floor level (number).
  - **Explanation**: The lowest floor level acceptable.
  - **Example**: 1

- **maxFloor**: Maximum floor level (number).
  - **Explanation**: The highest floor level acceptable.
  - **Example**: 10

- **minSquareMeter**: Minimum square meters (number).
  - **Explanation**: The smallest area in square meters.
  - **Example**: 60

- **maxSquareMeter**: Maximum square meters (number).
  - **Explanation**: The largest area in square meters.
  - **Example**: 150

- **imageOnly**: Filter to include only listings with images (boolean: 1 for true).
  - **Explanation**: Set to 1 to only show listings that have images.
  - **Example**: 1

- **priceOnly**: Filter to include only listings with prices (boolean: 1 for true).
  - **Explanation**: Set to 1 to only show listings that include pricing information.
  - **Example**: 1

- **settlements**: Filter for specific settlement areas (boolean: 1 for true).
  - **Explanation**: Set to 1 to include settlements in the search.
  - **Example**: 1

- **priceDropped**: Filter to include only listings where the price has dropped (boolean: 1 for true).
  - **Explanation**: Set to 1 to show listings with reduced prices.
  - **Example**: 1

- **brokerage**: Filter to include listings that involve brokerage (boolean: 1 for true).
  - **Explanation**: Set to 1 to include brokered listings.
  - **Example**: 1

- **newFromContractor**: Filter for new properties from contractors (boolean: 1 for true).
  - **Explanation**: Set to 1 to include new properties from developers.
  - **Example**: 1

- **property**: Comma-separated list of property type IDs as a string.
  - **Explanation**: Specifies the types of properties to include.
  - **Example**: "1,3,5"
  - **Property IDs**:
    - 1: דירה (Apartment)
    - 3: דירת גן (Garden Apartment)
    - 5: בית פרטי/ קוטג' (Private House/Cottage)
    - 6: גג/ פנטהאוז (Roof/Penthouse)
    - 7: דופלקס (Duplex)
    - 11: יחידת דיור (Housing Unit)
    - 25: תיירות ונופש (Tourism and Vacation)
    - 30: חניה (Parking)
    - 32: משק חקלאי/ נחלה (Agricultural Farm)
    - 33: מגרשים (Lots)
    - 39: דו משפחתי (Semi-detached House)
    - 41: כללי (General)
    - 44: בניין מגורים (Residential Building)
    - 45: מחסן (Warehouse)
    - 49: מרתף/ פרטר (Basement/Parterre)
    - 50: קב' רכישה/ זכות לנכס (Purchase Group/Right to Property)
    - 51: טריפלקס (Triplex)
    - 55: משק עזר (Auxiliary Farm)
    - 61: דיור מוגן (Sheltered Housing)

- **parking**: Filter to include listings with parking (boolean: 1 for true).
  - **Explanation**: Set to 1 to only show listings that include parking.
  - **Example**: 1

- **elevator**: Filter to include listings with an elevator (boolean: 1 for true).
  - **Explanation**: Set to 1 to only show listings with elevator access.
  - **Example**: 1

- **airConditioner**: Filter to include listings with air conditioning (boolean: 1 for true).
  - **Explanation**: Set to 1 to only show listings that have air conditioning.
  - **Example**: 1

- **balcony**: Filter to include listings with a balcony (boolean: 1 for true).
  - **Explanation**: Set to 1 to only show listings with a balcony.
  - **Example**: 1

- **shelter**: Filter to include listings with a shelter (boolean: 1 for true).
  - **Explanation**: Set to 1 to include listings that have a safe room or shelter.
  - **Example**: 1

- **bars**: Filter to include listings with bars on windows (boolean: 1 for true).
  - **Explanation**: Set to 1 to include listings with window bars.
  - **Example**: 1

- **warehouse**: Filter to include listings with a warehouse (boolean: 1 for true).
  - **Explanation**: Set to 1 to include listings that have a warehouse or storage space.
  - **Example**: 1

- **accessibility**: Filter to include accessible listings (boolean: 1 for true).
  - **Explanation**: Set to 1 to show listings that are wheelchair accessible.
  - **Example**: 1

- **renovated**: Filter to include renovated listings (boolean: 1 for true).
  - **Explanation**: Set to 1 to only show listings that have been renovated.
  - **Example**: 1

- **furniture**: Filter to include furnished listings (boolean: 1 for true).
  - **Explanation**: Set to 1 to include listings that come with furniture.
  - **Example**: 1

- **assetExclusive**: Filter for exclusive listings (boolean: 1 for true).
  - **Explanation**: Set to 1 to only show exclusive listings.
  - **Example**: 1

- **topArea**: Filter by top area code (number).
  - **Explanation**: Specifies the top area code for the search.
  - **Example**: 1

- **area**: Filter by area code (number).
  - **Explanation**: Specifies the specific area code.
  - **Example**: 2

- **city**: Filter by city code (number).
  - **Explanation**: Specifies the city for the search.
  - **Example**: 5000 (Tel Aviv-Yafo)
    - 3000: ירושלים (Jerusalem)
    - 5000: תל אביב-יפו (Tel Aviv-Yafo)
    - 4000: חיפה (Haifa)
    - 6400: הרצליה (Herzliya)
    - 6900: כפר סבא (Kfar Saba)
    - 8700: רעננה (Ra'anana)
    - 2600: אילת (Eilat)
    - 7900: פתח תקווה (Petah Tikva)
    - 8300: ראשון לציון (Rishon LeZion)
    - 6100: בני ברק (Bnei Brak)
    - 1200: מודיעין מכבים רעות (Modi'in-Maccabim-Re'ut)

- **subcategory**: forsale (For Sale), rent (For Rent).
  - **Explanation**: Specifies whether the search is for rentals or sales.
  - **Example**: "forsale"

- **propertyCondition**: Comma-separated list of property condition IDs as a string.
  - **Explanation**: Indicates the condition of the properties.
  - **Example**: "1,2"

- **searchUrl**: Generated search URL based on the input parameters.
  - **Format**: "BASE: https://www.yad2.co.il/realestate/ THEN: {category}?single-value-param=value&multiple-value-param=value1,value2&range-value-param=minvalue-maxvalue&text=keywords".
  - **Explanation**: The URL that users can visit to view the listings.
  - **Example**: "https://www.yad2.co.il/realestate/forsale?city=5000&property=1,3,5&minPrice=1000000&maxPrice=3000000&minRooms=2&maxRooms=5"

- **apiUrl**: Generated API URL for fetching the real estate data.
  - **Format**: "BASE: https://gw.yad2.co.il/realestate-feed/ THEN: {category}/map?single-value-param=value&multiple-value-param=value1,value2&range-value-param=minvalue-maxvalue&text=keywords".
  - **Explanation**: The URL used internally to fetch data via API.
  - **Example**: "https://gw.yad2.co.il/realestate-feed/forsale/map?city=5000&property=1,3,5&minPrice=1000000&maxPrice=3000000&minRooms=2&maxRooms=5"

**Pay close attention to the URLs:**

- **Do not change the order of the path parameters**; only modify the query parameters based on the input.
- When including parameters like 'property' or 'propertyCondition', which are strings of comma-separated values, ensure they are correctly formatted in the URLs.
- Ensure that all query parameters are correctly appended to the URLs with the appropriate parameter names.
- **Do not include undefined or null parameters** in the URLs.

### User Input:

"${userInput}"

Generate the JSON object accordingly, and include the 'searchUrl' and 'apiUrl' fields containing the generated URLs based on the input parameters.
		`;

		const params: ChatCompletionCreateParams = {
			model: 'gpt-4o-2024-08-06',
			messages: [
				{ role: 'system', content: 'Please adhere to the following JSON schema.' },
				{ role: 'user', content: prompt }
			],
			response_format: {
				type: 'json_schema',
				json_schema: {
					name: realEstateQuerySchema.name,
					description: realEstateQuerySchema.description,
					schema: realEstateQuerySchema,
					strict: true,
				},
			},
			temperature: TEMPERATURE,
			max_completion_tokens: MAX_TOKENS,
			top_p: TOP_P,
			frequency_penalty: FREQUENCY_PENALTY,
			presence_penalty: PRESENCE_PENALTY,
		};

		const queryResponse = await createCompletion(params);

		// Check if queryResponse and queryResponse.choices are defined
		if (!queryResponse || !queryResponse.choices || !queryResponse.choices[0].message?.content) {
			throw new Error('An error occurred while processing the user input.');
		}

		const queryParams: RealEstateOpenAiResponseParams = JSON.parse(queryResponse.choices[0].message.content);

		// Use the generated API URL from the queryParams
		const apiUrl = queryParams.apiUrl ?? '';

		const realEstateItems = await realEstateService.fetchRealEstateData(apiUrl);

		return { realEstateItems, queryParams };
	} catch (error) {
		console.error('Error handling real estate command:', error);
		throw new Error('There was an error processing your request.');
	}
}

export function generateMapUrl(lat: number, lon: number): string {
	const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
	const center = `${lat},${lon}`;
	const zoom = 15;
	const size = '600x400';
	const marker = `color:red|${lat},${lon}`;

	return `${baseUrl}?&center=${center}&format=jpg&zoom=${zoom}&size=${size}&markers=${marker}&key=${googleMapsApiKey}`;
}
