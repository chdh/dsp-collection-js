// Browser DOM utilities.

// Shows or hides a DOM element.
// If the element is a form control with associated label elements, the label elements are also affected.
export function showElement (elementId: string, visible = true) {
   const element = document.getElementById(elementId);
   if (!element) {
      return; }
   element.classList.toggle("hidden", !visible);
   if ((<any>element).labels) {
      for (const labelElement of (<any>element).labels) {
         labelElement.classList.toggle("hidden", !visible); }}}

export function getInputElement (elementId: string) : HTMLInputElement {
   const e = <HTMLInputElement>document.getElementById(elementId);
   if (!e) {
      throw new Error("No HTML element found with ID \"" + elementId + "\"."); }
   return e; }

export function getValue (elementId: string) : string {
   return getInputElement(elementId).value; }

export function setValue (elementId: string, newValue: string) {
   getInputElement(elementId).value = newValue; }

export function getValueNum (elementId: string, defaultValue: number = NaN) : number {
   const e = getInputElement(elementId);
   if (e.value == "") {
      return defaultValue; }
   return e.valueAsNumber; }

export function setValueNum (elementId: string, newValue: number) {
   const e = getInputElement(elementId);
   if (isNaN(newValue)) {
      e.value = ""; }
    else {
      e.valueAsNumber = newValue; }}

export function getChecked (elementId: string) : boolean {
   return getInputElement(elementId).checked; }

export function setChecked (elementId: string, newValue: boolean) {
   getInputElement(elementId).checked = newValue; }

export function setClass (elementId: string, className: string, enable = true) {
   const e = document.getElementById(elementId);
   if (!e) {
      return; }
   e.classList.toggle(className, enable); }
