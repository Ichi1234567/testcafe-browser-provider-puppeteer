import puppeteer from 'puppeteer';
import _ from 'lodash';

export default {
    // Multiple browsers support
    isMultiBrowser: true,

    browser: null,

    openedPages: {},


    // Required - must be implemented
    // Browser control
    async openBrowser (id, pageUrl, browserName) {

        if (!this.browser) {
            let puppeteerArgs = [];

            if (browserName === 'no_sandbox') {
                puppeteerArgs = [
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ];
            }
            this.browser = await puppeteer.launch({
                timeout: 10000,
                args: puppeteerArgs
            });

        }

        const page = await this.browser.newPage();

        await this.abortPageRequest(page, ['image', 'document'], (theUrl, originAbort) => {
          // if it is ga, dont abort
          return /www.google-analytics.com/.test(theUrl) ? false : originAbort;
        });
        await page.goto(pageUrl);
        this.openedPages[id] = page;
    },

    async closeBrowser (id) {
        delete this.openedPages[id];
        await this.browser.close();
    },


    async isValidBrowserName () {
        return true;
    },

    // Extra methods
    async resizeWindow (id, width, height) {
        await this.openedPages[id].setViewport({ width, height });
    },

    async takeScreenshot (id, screenshotPath) {
        await this.openedPages[id].screenshot({ path: screenshotPath });
    },

    async abortPageRequest(page, resources = ['image', 'stylesheet', 'document'], filter = null) {
      await page.setRequestInterception(true);

      page.on('request', request => {
        const resourceType = request.resourceType();
        let abort = false;

        if (_.indexOf(resources, resourceType) >= 0) {
          abort = true;
        }
        if (filter) {
          abort = filter(request.url(), abort);
        }
        // if it will redirect, dont abort
        if (request.isNavigationRequest()) {
          abort = false;
        }

        request[abort ? 'abort' : 'continue']();
      });
    }
};
