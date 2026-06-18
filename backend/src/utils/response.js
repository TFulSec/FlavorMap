const success = (res, data = null, message = 'OK', meta = null) => {
    return res.json({
        success: true,
        message,
        data,
        meta
    });
};

const error = (res, message = 'Error', code = 400, errors = []) => {
    return res.status(code).json({
        success: false,
        message,
        errors
    });
};

module.exports = { success, error };