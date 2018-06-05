
export default class BinarySearch {
    /*
    * Binary search in JavaScript.
    * Returns the index of of the element in a sorted array or (-n-1) where n is the insertion point for the new element.
    * Parameters:
    *     list - A sorted array
    *     target - An element to search for
    *     compare_fn - A comparator function. The function takes two arguments: (a, b) and returns:
    *        a negative number  if a is less than b;
    *        0 if a is equal to b;
    *        a positive number of a is greater than b.
    * The array may contain duplicate elements. If there are more than one equal elements in the array, 
    * the returned value can be the index of any one of the equal elements.
    */
    static search(list, target, compare_fn) {
        var m = 0;
        var n = list.length - 1;
        while (m <= n) {
            var k = (n + m) >> 1;
            var cmp = compare_fn(target, list[k]);
            if (cmp > 0) {
                m = k + 1;
            } else if(cmp < 0) {
                n = k - 1;
            } else {
                return k;
            }
        }
        return -m - 1;
    }
}
