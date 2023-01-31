// Takes in two arrays of numbers expressed as strings and returns a
// sorted version with all numbers from both but without duplicates
export function addToArray(aStr: string[], bStr: string[]): string[] {
  return removeConsecutiveDuplicates(
    [...aStr, ...bStr] // merge
      .map(str => +str) // conver to numbers
      .sort((v1, v2) => v1 - v2) // sort
  ).map(n => n.toString()); // convert back to strings
}

// Takes in the array to remove from (aStr) and the array with items to
// remove (bStr), where items are numbers represented as strings and returns
// a sorted array with all items from aStr but without items present in bStr
export function removeFromArray(aStr: string[], bStr: string[]): string[] {
  const bStrSet = new Set(bStr);
  const aNum = aStr.map(v => +v).sort((v1, v2) => v1 - v2);
  const result = [];
  for (const num of aNum) {
    const str = num.toString();
    if (bStrSet.has(str)) continue; // do not add if bStr includes it
    result.push(str);
  }
  return result;
}

// Modifies array in place and returns it
export function removeConsecutiveDuplicates(array: any[]) {
  for (let i = 1; i < array.length; i++) {
    if (array[i - 1] !== array[i]) continue;
    array.splice(i, 1);
    i--;
  }
  return array;
}

// Returns the name of an existing selection that the new one overlaps with, if any
export function checkForOverlap(existingSelections: [string, string][], newSelection: string[]): string | undefined {
  const set = new Set(newSelection);
  for (const [name, selection] of existingSelections) {
    const pages = selection.split(",")
    for (const p of pages)
      if (set.has(p)) return name;
  }
}
