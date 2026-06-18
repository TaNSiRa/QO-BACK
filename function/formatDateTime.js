function ISOToLocal(DateTime) {
    const localTime = new Date(DateTime.getTime() + 7 * 60 * 60 * 1000);
    return localTime.toISOString();
}

module.exports = { ISOToLocal };