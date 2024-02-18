const today = new Date();
			
const copyrightYearLabels = document.querySelectorAll(".copyright-year")
copyrightYearLabels.forEach(item => {
    if (item !== null) {
        item.innerHTML = today.getFullYear().toString();
    }
})