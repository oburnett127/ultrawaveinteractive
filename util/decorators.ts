export function AutoSetter(target: any, key: string) {
  const privateKeyName = `_${key}`;
  
  // Getter
  const getter = function (this: any) {
    return this[privateKeyName];
  };

  // Setter
  const setter = function (this: any, newValue: any) {
    if (newValue >= 0) {
      this[privateKeyName] = newValue;
    } else {
      console.error('Quantity cannot be negative.');
    }
  };

  // Define property with getter and setter
  Object.defineProperty(target, key, {
    get: getter,
    set: setter,
    enumerable: true,
    configurable: true,
  });
}
