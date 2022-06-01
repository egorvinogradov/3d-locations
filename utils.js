function getCSSVariable(key){
  return getComputedStyle(document.documentElement).getPropertyValue(key);
}
