const fs = require('fs');
const axios = require('axios');
const { PDFDocument } = require('pdf-lib');
const path = require('path');

require('dotenv').config();
require('./utils').checkEnvVariables();

const CONFIG = {
    START_INDEX: Number(process.env.START_INDEX),
    NUM_PDFS: Number(process.env.NUM_PDFS),
    SESSION_COOKIE: process.env.SESSION_COOKIE,
    COMBINED_PDF: process.env.COMBINED_PDF,
    PDF_DIR: path.join(__dirname, 'pdfs'),
};

const instance = axios.create({
    baseURL: 'https://lms.ignouonline.ac.in/pluginfile.php',
    responseType: 'stream',
    headers: {
        Cookie: CONFIG.SESSION_COOKIE,
        'Content-Type': 'application/pdf',
    },
});

const downloadPdf = async (unit) => {
    const filename = `Unit-${unit + 1}.pdf`;
    const url = `/${
        CONFIG.START_INDEX + unit
    }/mod_resource/content/1/${filename}`;
    process.stdout.write(`Downloading ${filename}...\r`);
    try {
        const response = await instance.get(url);
        const stream = response.data.pipe(
            fs.createWriteStream(path.join(CONFIG.PDF_DIR, filename))
        );
        await new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });
    } catch (error) {
        console.error(`Error downloading ${filename}: ${error.message}`);
        throw error;
    }
};

const downloadPdfs = async () => {
    console.clear();
    console.log(`Downloading ${CONFIG.NUM_PDFS} PDFs...\n`);
    for (let i = 0; i < CONFIG.NUM_PDFS; i++) {
        await downloadPdf(i);
    }
};

const combinePdfs = async () => {
    console.clear();
    console.log(
        `All PDFs downloaded!\nCombining PDFs into ${CONFIG.COMBINED_PDF}...\n`
    );
    const pdfs = [];
    for (let i = 1; i <= CONFIG.NUM_PDFS; i++) {
        const pdfBytes = await fs.promises.readFile(
            path.join(CONFIG.PDF_DIR, `Unit-${i}.pdf`)
        );
        const pdfDoc = await PDFDocument.load(pdfBytes);
        pdfs.push(pdfDoc);
    }
    const combinedPdf = await PDFDocument.create();
    for (const pdfDoc of pdfs) {
        const pages = await combinedPdf.copyPages(
            pdfDoc,
            pdfDoc.getPageIndices()
        );
        pages.forEach((page) => combinedPdf.addPage(page));
    }
    const bytes = await combinedPdf.save();
    fs.writeFileSync(CONFIG.COMBINED_PDF, bytes);
    console.log(`PDFs combined and saved to ${CONFIG.COMBINED_PDF}!\n`);
};

const cleanup = async () => {
    console.clear();
    console.log(
        `All PDFs downloaded!\nPDFs combined and saved to ${CONFIG.COMBINED_PDF}!\nCleaning up downloaded PDFs...\n`
    );
    for (let i = 1; i <= CONFIG.NUM_PDFS; i++) {
        const filename = `Unit-${i}.pdf`;
        process.stdout.write(`Removing ${filename}...\r`);
        const filePath = path.join(CONFIG.PDF_DIR, filename);
        fs.unlinkSync(filePath);
        process.stdout.write(`Removed ${filename}!\r`);
    }
    fs.rmdir(CONFIG.PDF_DIR, (err) => {
        if (err) {
            console.error(err);
            return;
        }
    });
};

const main = async () => {
    try {
        await fs.promises.mkdir(CONFIG.PDF_DIR);
    } catch (error) {
        // Ignore 'dir already exists' error
        if (error.code !== 'EEXIST') {
            console.error(
                `Error creating directory '${CONFIG.PDF_DIR}': ${error.message}`
            );
            throw error;
        }
    }
    await downloadPdfs();
    await combinePdfs();
    await cleanup();
    console.clear();
    console.log('All PDFs downloaded!');
    console.log(`PDFs combined and saved to ${CONFIG.COMBINED_PDF}!`);
};

main();
