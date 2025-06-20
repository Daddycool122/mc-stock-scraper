const fs = require('fs');
const { google } = require('googleapis');

// scrapeMoneyControl.js
const axios = require("axios");
const cheerio = require("cheerio");

const companyUrls = {
  RELIANCE: "https://www.moneycontrol.com/india/stockpricequote/refineries/relianceindustries/RI",
  TCS: "https://www.moneycontrol.com/india/stockpricequote/computers-software/tataconsultancyservices/TCS",
  INFY: "https://www.moneycontrol.com/india/stockpricequote/computers-software/infosys/IT",
  HDFCBANK: "https://www.moneycontrol.com/india/stockpricequote/banks-private-sector/hdfcbank/HDF01",
  ICICIBANK: "https://www.moneycontrol.com/india/stockpricequote/banks-private-sector/icicibank/ICI02",
  HINDUNILVR: "https://www.moneycontrol.com/india/stockpricequote/personal-care/hindustanunilever/HU",
  SBIN: "https://www.moneycontrol.com/india/stockpricequote/banks-public-sector/statebankindia/SBI",
  KOTAKBANK: "https://www.moneycontrol.com/india/stockpricequote/banks-private-sector/kotakmahindrabank/KMB",
  ITC: "https://www.moneycontrol.com/india/stockpricequote/cigarettes/itc/ITC",
  LT: "https://www.moneycontrol.com/india/stockpricequote/constructioncontracting-civil/larsentoubro/LT"
};

async function scrapeCompanyData(name, url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const mcScore = $(".mctn_strfl .mctn_strprcnt strong").text().trim() || "N/A";

    const swot = {
      Strengths: Number($('.mctn_swotbox:contains("Strengths") strong').text().trim()) || 0,
      Weaknesses: Number($('.mctn_swotbox:contains("Weaknesses") strong').text().trim()) || 0,
      Opportunities: Number($('.mctn_swotbox:contains("Opportunities") strong').text().trim()) || 0,
      Threats: Number($('.mctn_swotbox:contains("Threats") strong').text().trim()) || 0
    };

    return {
      Company: name,
      MC_Essential_Score: mcScore,
      ...swot
    };
  } catch (err) {
    console.error(`Error fetching data for ${name}:`, err.message);
    return { Company: name, Error: "Failed to fetch" };
  }
}

async function scrapeAll() {
  const results = [];

  for (const [name, url] of Object.entries(companyUrls)) {
    const companyData = await scrapeCompanyData(name, url);
    results.push(companyData);
  }

  console.table(results);
  return results;
}

async function writeToGoogleSheet(data) {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const spreadsheetId = 'YOUR_SHEET_ID_HERE'; // from the URL
  const sheetName = 'Sheet1';

  const rows = data.map(entry => [
    entry.Company,
    entry.MC_Essential_Score,
    entry.Strengths,
    entry.Weaknesses,
    entry.Opportunities,
    entry.Threats
  ]);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A2:F`,
    valueInputOption: 'RAW',
    requestBody: {
      values: rows,
    }
  });

  console.log('✅ Data written to Google Sheet successfully.');
}


scrapeAll().then(writeToGoogleSheet);
