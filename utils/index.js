const checkEnvVariables = () => {
    const requiredEnvVars = [
        'START_INDEX',
        'NUM_PDFS',
        'SESSION_COOKIE',
        'COMBINED_PDF',
    ];

    const missingEnvVars = requiredEnvVars.filter(
        (envVar) => !(envVar in process.env)
    );

    if (missingEnvVars.length > 0) {
        const errorMessage = `Missing required environment variables: ${missingEnvVars.join(
            ', '
        )}`;
        throw new Error(errorMessage);
    }
};

module.exports = { checkEnvVariables };
