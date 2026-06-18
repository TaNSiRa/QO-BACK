exports.formatDateTimeToSQL = (isoString) => {
    const date = new Date(isoString);

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");

    const formattedDate = `${year}-${month}-${day}`;
    const formattedTime = `${hours}:${minutes}:${seconds}`;

    return `${formattedDate} ${formattedTime}`;
};

exports.formatDateTimeToSAP = (isoString) => {
    const date = new Date(isoString);

    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const day = date.getUTCDate().toString().padStart(2, "0");

    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    const seconds = date.getUTCSeconds().toString().padStart(2, "0");

    const formattedDate = `${year}-${month}-${day}`;
    const formattedTime = `${hours}:${minutes}:${seconds}.000`;
    return `${formattedDate} ${formattedTime}`;
};

exports.convertDateFromSAP = (dateStr) => {
    const [day, month, year] = dateStr.split(".");
    return `${year}-${month}-${day}`;
};

exports.convertDMYtoYMD = (dateStr) => {
    const [day, month, year] = dateStr.split("-");
    return `${year}-${month}-${day}`;
};

exports.getDaysInMonth = (month, year) => {
    // month: 1-12, year: ปี ค.ศ.
    return new Date(year, month, 0).getDate();
};

exports.getMonthNameShort = (monthNumber) => {
    const date = new Date(2000, monthNumber - 1);
    return date.toLocaleString("en-US", { month: "short" });
};

var months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
var monthsTH = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
];

exports.DateTimeNow = () => {
    try {
        var date = new Date();
        var today = "";
        var dd = String(date.getDate()).padStart(2, "0");
        var mm = String(date.getMonth() + 1).padStart(2, "0"); //January is 0!
        var yyyy = date.getFullYear();
        var yearmonth = yyyy + mm;
        today = yyyy + "-" + mm + "-" + dd;
        var dtn = today + " " + date.toLocaleTimeString("en-GB").slice(0, 8);
        return dtn;
    } catch (err) {
        //console.log("err");
        return "";
    }
};

exports.DateNow = () => {
    try {
        var date = new Date();
        var today = "";
        var dd = String(date.getDate()).padStart(2, "0");
        var mm = String(date.getMonth() + 1).padStart(2, "0"); //January is 0!
        var yyyy = date.getFullYear();
        var yearmonth = yyyy + mm;
        today = yyyy + "-" + mm + "-" + dd;
        console.log("DateNowFunction : " + today);
        return today;
    } catch (err) {
        //console.log("err");
        return "";
    }
};

exports.TimeNow = () => {
    try {
        var date = new Date();
        var tn = date.toLocaleTimeString("en-GB").slice(0, 8);
        return tn;
    } catch (err) {
        //console.log("err");
        return "";
    }
};

exports.toDateOnlyD = (DateTimeIn) => {
    try {
        if (DateTimeIn != "" && DateTimeIn != null) {
            var buffSamDate = new Date(DateTimeIn);
            var curr_date = buffSamDate.getUTCDate();
            var dt = curr_date;
            return dt;
        } else {
            //console.log("else");
            return "";
        }
    } catch (err) {
        //console.log("err");
        return "";
    }
};

exports.toDateOnly = (DateTimeIn) => {
    try {
        if (DateTimeIn != "" && DateTimeIn != null) {
            var buffSamDate = new Date(DateTimeIn);
            //save already convert so used utc0
            var curr_date = buffSamDate.getUTCDate();
            var curr_month = buffSamDate.getUTCMonth() + 1; //Months are zero based
            var curr_year = buffSamDate.getUTCFullYear();
            var dt = curr_date + "-" + curr_month + "-" + curr_year;
            return dt;
        } else {
            //console.log("else");
            return "";
        }
    } catch (err) {
        //console.log("err");
        return "";
    }
};

exports.toDateSQL = (DateTimeIn) => {
    try {
        //console.log(DateTimeIn);
        if (DateTimeIn != "" && DateTimeIn != null) {
            var buffSamDate = new Date(DateTimeIn);
            var curr_date = buffSamDate.getUTCDate();
            var curr_month = buffSamDate.getUTCMonth() + 1; //Months are zero based
            var curr_year = buffSamDate.getUTCFullYear();
            var dt = curr_year + "-" + curr_month + "-" + curr_date;
            return dt;
        } else {
            //console.log("else");
            return "";
        }
    } catch (err) {
        //console.log("err");
        return "";
    }
};

exports.toMonthOnly = (DateTimeIn) => {
    try {
        //console.log(DateTimeIn);
        if (DateTimeIn != "" && DateTimeIn != null) {
            var buffSamDate = new Date(DateTimeIn);
            var curr_month = buffSamDate.getUTCMonth() + 1; //Months are zero based
            return curr_month;
        } else {
            //console.log("else");
            return "";
        }
    } catch (err) {
        //console.log("err");
        return "";
    }
};

exports.toYearOnly = (DateTimeIn) => {
    try {
        //console.log(DateTimeIn);
        if (DateTimeIn != "" && DateTimeIn != null) {
            var buffSamDate = new Date(DateTimeIn);
            var curr_year = buffSamDate.getUTCFullYear();
            return curr_year;
        } else {
            //console.log("else");
            return "";
        }
    } catch (err) {
        //console.log("err");
        return "";
    }
};

exports.toDateOnlyMonthName = (DateTimeIn) => {
    try {
        //console.log(DateTimeIn);
        if (DateTimeIn != "" && DateTimeIn != null) {
            var buffSamDate = new Date(DateTimeIn);
            var curr_date = buffSamDate.getUTCDate();
            //var curr_month = buffSamDate.getMonth() + 1; //Months are zero based
            var curr_monthName = buffSamDate.toLocaleString("en-US", {
                month: "short",
            });
            var curr_year = buffSamDate.getUTCFullYear();
            var dt = curr_date + "-" + curr_monthName + "-" + curr_year;
            return dt;
        } else {
            //console.log("else");
            return "";
        }
    } catch (err) {
        //console.log("err");
        return "";
    }
};

exports.toDateMonthNameTH = (DateTimeIn) => {
    try {
        //console.log(DateTimeIn);
        if (DateTimeIn != "" && DateTimeIn != null) {
            var buffSamDate = new Date(DateTimeIn);
            var curr_date = buffSamDate.getUTCDate();
            var curr_month = buffSamDate.getUTCMonth(); //Months are zero based
            var curr_year = buffSamDate.getUTCFullYear() + 543;

            var dt = curr_date + " " + monthsTH[curr_month] + " " + curr_year;
            return dt;
        } else {
            //console.log("else");
            return "";
        }
    } catch (err) {
        //console.log("err");
        return "";
    }
};