import puppeteer from "puppeteer";
import fs from "fs-extra";
import path from "path";
import { projectConfig } from "./config.js";

// Configuration
const URL = "http://localhost:3000/?credit=false";
const CONTAINER_SELECTOR = ".chart-container";
const OUTPUT_DIR = "public/fallbacks";
const SCREENSHOT_WIDTH = 600;
const SLUG = projectConfig.project.slug;

async function takeScreenshot() {
  console.log("Starting screenshot process...");
  
  // Create output directory if it doesn't exist
  fs.ensureDirSync(OUTPUT_DIR);
  console.log(`Output directory: ${OUTPUT_DIR}`);

  let browser;
  try {
    // Launch browser with more robust configuration
    browser = await puppeteer.launch({
      headless: true, // Use true instead of "new"
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      timeout: 60000 // Increase timeout to 60 seconds
    });

    console.log("Browser launched successfully");

    const page = await browser.newPage();
    console.log("New page created");

    // Set viewport
    await page.setViewport({
      width: SCREENSHOT_WIDTH,
      height: 800,
      deviceScaleFactor: 2
    });
    console.log("Viewport set");

    // Enable request interception to debug network issues
    await page.setRequestInterception(true);
    page.on('request', request => {
      console.log(`Request: ${request.method()} ${request.url()}`);
      request.continue();
    });

    page.on('response', response => {
      console.log(`Response: ${response.status()} ${response.url()}`);
    });

    console.log(`Navigating to ${URL}...`);
    
    // Try a different approach to page loading
    const response = await page.goto(URL, {
      waitUntil: ['domcontentloaded', 'networkidle0'],
      timeout: 60000
    });

    if (!response.ok()) {
      throw new Error(`Page load failed with status: ${response.status()}`);
    }

    console.log("Page loaded successfully");

    // Wait for the container with a longer timeout
    console.log("Waiting for chart container...");
    await page.waitForSelector(CONTAINER_SELECTOR, { 
      timeout: 30000,
      visible: true 
    });
    console.log("Chart container found");

    // Hide elements with .hide-in-static class
    await page.evaluate((selector) => {
      const elements = document.querySelectorAll(".hide-in-static");
      elements.forEach(el => el.style.display = "none");
      
      const container = document.querySelector(selector);
      if (container) {
        container.classList.add("is-screenshot");
      }
    }, CONTAINER_SELECTOR);
    console.log("Elements hidden and classes added");

    // Get container dimensions
    const container = await page.$(CONTAINER_SELECTOR);
    const box = await container.boundingBox();
    
    if (!box) {
      throw new Error("Could not get container dimensions");
    }
    console.log("Container dimensions obtained");

    // Adjust viewport to container height
    await page.setViewport({
      width: SCREENSHOT_WIDTH,
      height: Math.ceil(box.height),
      deviceScaleFactor: 2
    });
    console.log("Viewport adjusted");

    // Take screenshot
    console.log("Taking screenshot...");
    const screenshot = await page.screenshot({
      type: "png",
      clip: {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height
      }
    });
    console.log("Screenshot taken");

    // Save the screenshot with slug-based filename
    const outputPath = path.join(OUTPUT_DIR, `${SLUG}-static.png`);
    fs.writeFileSync(outputPath, screenshot);
    console.log(`✅ Screenshot saved to ${outputPath}`);

  } catch (error) {
    console.error("❌ Error taking screenshot:", error.message);
    console.error("Stack trace:", error.stack);
    
    if (error.message.includes("net::ERR_CONNECTION_REFUSED")) {
      console.error("Could not connect to the server. Please ensure:");
      console.error("1. The development server is running");
      console.error("2. The server is accessible at", URL);
    } else if (error.message.includes("socket hang up")) {
      console.error("Connection was terminated unexpectedly. This could be due to:");
      console.error("1. Server timeout");
      console.error("2. Network issues");
      console.error("3. Browser process issues");
      console.error("Try running the development server with increased timeout settings");
    }
    process.exit(1);
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log("Browser closed successfully");
      } catch (error) {
        console.error("Error closing browser:", error.message);
      }
    }
  }
}

// Run the screenshot process
takeScreenshot(); 