export default function getCSSVar(varName, element = document.documentElement) {
    // Ensure the variable name starts with --
    const name = varName.startsWith("--") ? varName : `--${varName}`;

    return getComputedStyle(element).getPropertyValue(name).trim();
}

