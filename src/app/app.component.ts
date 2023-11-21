import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  servProvCode: string = '';
  environment: string = '';
  selectedTimeframe: string = 'TODAY';
  beginTimestamp: Number = 0;
  endTimestamp: Number = 0;
  activeBeginCalendarValue: string = '';
  activeEndCalendarValue: string = '';
  applicationsUsed: string[] = [];
  traceId: string = '';
  additionalParams: string = '';

  ngOnInit() {
    const { beginTimestamp, endTimestamp } = this.generateTimestamps();

    // Prepopulate the form elements with the generated timestamps
    this.activeBeginCalendarValue = beginTimestamp.toISOString().slice(0, 16);
    this.activeEndCalendarValue = endTimestamp.toISOString().slice(0, 16);
  }

  onSubmit(event: Event) {
    event.preventDefault();

    const traceIdElement = this.getInputElement(
      'inputTraceID'
    ) as HTMLInputElement;
    this.traceId = traceIdElement.value;
    const additionaParamsElement = this.getInputElement(
      'inputAdditionalParams'
    ) as HTMLInputElement;
    this.additionalParams = additionaParamsElement.value;

    console.log('Trace ID:', this.traceId);
    console.log('Additional Parameters:', this.additionalParams);

    // If looking for just a trace_id, don't bother considering other values or validating form
    if (this.traceId.trim() !== '') {
      const timestamps = this.setTimestampsFromTraceId(this.traceId);
      let redirectURL = '';

      if (timestamps) {
        const { beginTimestamp, endTimestamp } = timestamps;
        this.beginTimestamp = beginTimestamp;
        this.endTimestamp = endTimestamp;

        if (this.isTimestampInFuture(beginTimestamp, endTimestamp)) {
          return;
        }

        console.log('Begin Timestamp:', this.beginTimestamp);
        console.log('End Timestamp:', this.endTimestamp);

        const datadogQuery = `*${this.traceId}* OR @TRACE_ID:${this.traceId}`;

        if (this.isTimestampMoreThanFifteenDaysAgo(beginTimestamp)) {
          console.log(
            'Timestamp is more than fifteen days ago. Rehydrate is required'
          );
          redirectURL = this.generateRehydrateURL(datadogQuery);
        } else {
          redirectURL = this.generateRedirectURL(datadogQuery);
        }

        console.log('Redirect URL:', redirectURL);

        this.openURLInNewTab(redirectURL);
      } else {
        // Handle the case when the traceID is invalid or for a future date
        alert('Invalid traceID.');
        return;
      }
    }
    // If not looking for trace_id, validate form values, generate a query, and redirect
    else {
      const formIsValid = this.validateForm(); // Validate form fields

      console.log('Form is valid:', formIsValid);

      const [beginUnixTimestamp, endUnixTimestamp] = this.convertTimestamps(); // Convert timestamps to Unix

      console.log('Begin Unix Timestamp:', beginUnixTimestamp);
      console.log('End Unix Timestamp:', endUnixTimestamp);

      if (!formIsValid) {
        return;
      }

      if (!this.validateTimestamps(beginUnixTimestamp, endUnixTimestamp)) {
        return;
      } else {
        //if valid timestamps, set timestamps
        this.setValues(beginUnixTimestamp, endUnixTimestamp);
      }

      if (this.additionalParams.trim() !== '') {
        this.setAdditionalParams();
        console.log('Additional Parameters:', this.additionalParams);
      }

      const datadogQuery = this.generateDatadogQuery(
        this.servProvCode,
        this.environment,
        this.applicationsUsed
      );

      console.log('Datadog Query:', datadogQuery);
      let redirectURL = '';
      if (this.isTimestampMoreThanFifteenDaysAgo(beginUnixTimestamp)) {
        console.log(
          'Timestamp is more than fifteen days ago. Rehydrate is required'
        );
        redirectURL = this.generateRehydrateURL(datadogQuery);
      } else {
        redirectURL = this.generateRedirectURL(datadogQuery);
      }

      console.log('Redirect URL:', redirectURL);

      this.openURLInNewTab(redirectURL);
    }
  }

  onTimeframeChange() {
    const currentDate = new Date();

    let beginTimestampDate = new Date();
    if (this.selectedTimeframe === 'TODAY') {
      beginTimestampDate = new Date(currentDate);
      beginTimestampDate.setHours(0, 0, 0, 0); // Set
    }
    if (this.selectedTimeframe === 'Past 15 Minutes') {
      beginTimestampDate.setMinutes(currentDate.getMinutes() - 15);
    } else if (this.selectedTimeframe === 'Past 1 Hour') {
      beginTimestampDate.setHours(currentDate.getHours() - 1);
    } else if (this.selectedTimeframe === 'Past 4 Hours') {
      beginTimestampDate.setHours(currentDate.getHours() - 4);
    } else if (this.selectedTimeframe === 'Past 1 Day') {
      beginTimestampDate.setDate(currentDate.getDate() - 1);
    } else if (this.selectedTimeframe === 'Past 2 Days') {
      beginTimestampDate.setDate(currentDate.getDate() - 2);
    } else if (this.selectedTimeframe === 'Past 3 Days') {
      beginTimestampDate.setDate(currentDate.getDate() - 3);
    } else if (this.selectedTimeframe === 'Past 7 Days') {
      beginTimestampDate.setDate(currentDate.getDate() - 7);
    } else if (this.selectedTimeframe === 'Past 15 Days') {
      beginTimestampDate.setHours(currentDate.getHours() - 360); // 360 hours ago
      beginTimestampDate.setMinutes(currentDate.getMinutes() + 1); // Subtract 1 minute
    }

    this.activeBeginCalendarValue = this.convertUTCtoLocal(beginTimestampDate)
      .toISOString()
      .slice(0, 16);
    this.activeEndCalendarValue = this.convertUTCtoLocal(currentDate)
      .toISOString()
      .slice(0, 16);
  }

  private convertUTCtoLocal(utcDate: Date): Date {
    const localTimezoneOffset = utcDate.getTimezoneOffset();
    const localDate = new Date(utcDate.getTime() - localTimezoneOffset * 60000);
    return localDate;
  }

  private validateForm(): boolean {
    const servProvCodeElement = this.getInputElement(
      'inputServProvCode'
    ) as HTMLInputElement;
    const environmentElement = this.getInputElement(
      'inputEnvironment'
    ) as HTMLSelectElement;
    const beginTimestampElement = this.getInputElement(
      'inputBeginTimestamp'
    ) as HTMLInputElement;
    const endTimestampElement = this.getInputElement(
      'inputEndTimestamp'
    ) as HTMLInputElement;

    const missingFields: string[] = [];

    if (servProvCodeElement.value.trim() === '')
      missingFields.push('ServProvCode');
    if (
      environmentElement.value.trim() === '' ||
      environmentElement.value.trim() === '--SELECT--'
    )
      missingFields.push('Environment');
    if (beginTimestampElement.value.trim() === '')
      missingFields.push('Begin Timestamp');
    if (endTimestampElement.value.trim() === '')
      missingFields.push('End Timestamp');

    if (missingFields.length > 0) {
      alert('Please fill in the following fields: ' + missingFields.join(', '));
      return false;
    }

    return true;
  }

  private validateTimestamps(
    beginTimestamp: number,
    endTimestamp: number
  ): boolean {
    if (endTimestamp - beginTimestamp < 60000) {
      alert(
        'End timestamp must be at least 1 minute after the begin timestamp.'
      );
      return false;
    }
    if (this.isTimestampInFuture(beginTimestamp, endTimestamp)) {
      return false;
    }

    return true;
  }

  private isTimestampInFuture(
    beginTimestamp: number,
    endTimestamp: number
  ): boolean {
    const currentUnixTimestamp = new Date().getTime();

    if (
      beginTimestamp > currentUnixTimestamp ||
      endTimestamp > currentUnixTimestamp
    ) {
      alert('Timestamps cannot be in the future.');
      return true;
    }

    return false;
  }

  private isTimestampMoreThanFifteenDaysAgo(beginTimestamp: number): boolean {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    return new Date(beginTimestamp) < fifteenDaysAgo;
  }

  private setValues(beginTimestamp: number, endTimestamp: number) {
    this.servProvCode = (
      this.getInputElement('inputServProvCode') as HTMLInputElement
    )?.value;
    this.environment = (
      this.getInputElement('inputEnvironment') as HTMLInputElement
    )?.value;
    this.beginTimestamp = beginTimestamp;
    this.endTimestamp = endTimestamp;
    this.applicationsUsed = this.getCheckedApplications();

    console.log('ServProvCode:', this.servProvCode);
    console.log('Environment:', this.environment);
    console.log('Begin Timestamp:', this.beginTimestamp);
    console.log('End Timestamp:', this.endTimestamp);
    console.log('Applications Used:', this.applicationsUsed);
  }

  private convertTimestamps(): [number, number] {
    const beginTimestampElement = this.getInputElement(
      'inputBeginTimestamp'
    ) as HTMLInputElement;
    const endTimestampElement = this.getInputElement(
      'inputEndTimestamp'
    ) as HTMLInputElement;

    return this.convertToUnixTimestamps(
      beginTimestampElement.value,
      endTimestampElement.value
    );
  }

  private getInputElement(id: string): HTMLElement | null {
    return document.getElementById(id);
  }

  private getCheckedApplications(): string[] {
    const checkboxes = document.getElementsByName(
      'applicationsUsed[]'
    ) as NodeListOf<HTMLInputElement>;
    return Array.from(checkboxes)
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);
  }

  private convertToUnixTimestamps(
    beginTimestamp: string,
    endTimestamp: string
  ): [number, number] {
    // Parse the timestamp strings into Date objects
    const beginDate = new Date(beginTimestamp);
    const endDate = new Date(endTimestamp);

    // Convert the Date objects to Unix timestamps in milliseconds
    const beginUnixTimestamp = beginDate.getTime();
    const endUnixTimestamp = endDate.getTime();

    return [beginUnixTimestamp, endUnixTimestamp];
  }

  private generateDatadogQuery(
    servProvCode: string,
    environment: string,
    applicationsUsed: string[]
  ) {
    // Format the Datadog query
    let query = `(*${servProvCode.toUpperCase()}*`;

    if (applicationsUsed.includes('Civic Platform')) {
      query += ` OR @SERV_PROV_CODE:*${servProvCode.toUpperCase()}* OR @JNDI:*${servProvCode.toLowerCase()}-${environment.toLowerCase()}* OR @JNDI:*${servProvCode.toUpperCase()}-${environment.toUpperCase()}*`;
    }

    if (applicationsUsed.includes('Citizen Access')) {
      query += ` OR filename:*${servProvCode.toLowerCase()}-${environment.toLowerCase()}*`;
    }

    query += ') AND (';

    if (applicationsUsed.includes('CAPI')) {
      // Add environment-specific conditions
      switch (environment) {
        case 'PROD':
          query += 'host:*mtprd*';
          break;
        case 'TEST':
        case 'SUPP':
        case 'NONPROD1':
        case 'NONPROD2':
        case 'NONPROD3':
        case 'NONPROD4':
          query += 'host:*mtsup*';
          break;
        case 'STG':
          query += 'host:*stg*';
          break;
        case 'CVCN':
          query += 'host:*cvcn*';
          break;
      }
      if (
        applicationsUsed.includes('Citizen Access') &&
        !applicationsUsed.includes('Civic Platform')
      ) {
        query += ' AND service:aca';
      }
      if (
        applicationsUsed.includes('Civic Platform') &&
        !applicationsUsed.includes('Citizen Access')
      ) {
        query += ' AND -service:aca';
      }
      query += ` OR (service:capi AND @Properties.log.EnvName:${this.environment.toUpperCase()} AND @Properties.log.Agency:${this.servProvCode.toUpperCase()}))`;
    } else {
      // Add environment-specific conditions
      switch (environment) {
        case 'PROD':
          query += 'host:*mtprd*';
          break;
        case 'TEST':
        case 'SUPP':
        case 'NONPROD1':
        case 'NONPROD2':
        case 'NONPROD3':
        case 'NONPROD4':
          query += 'host:*mtsup*';
          break;
        case 'STG':
          query += 'host:*stg*';
          break;
        case 'CVCN':
          query += 'host:*cvcn*';
          break;
      }
      if (
        applicationsUsed.includes('Citizen Access') &&
        !applicationsUsed.includes('Civic Platform')
      ) {
        query += ' AND service:aca';
      }
      if (
        applicationsUsed.includes('Civic Platform') &&
        !applicationsUsed.includes('Citizen Access')
      ) {
        query += ' AND -service:aca';
      }
      query += ')';

      if (
        applicationsUsed.includes('CAPI') &&
        !applicationsUsed.includes('Civic Platform') &&
        !applicationsUsed.includes('Civic Platform')
      ) {
        query = `service:capi AND @Properties.log.EnvName:${this.environment.toUpperCase()} AND @Properties.log.Agency:${this.servProvCode.toUpperCase()}`;
      }
    }
    if (this.additionalParams.trim() !== '') {
      query += ` (${this.additionalParams})`;
    }
    return query;
  }

  private generateRehydrateURL(query: string) {
    const baseURL =
      'https://app.datadoghq.com/logs/pipelines/historical-views/add';
    const queryParams = new URLSearchParams({
      query,
      from_ts: this.beginTimestamp.toString(),
      to_ts: this.endTimestamp.toString(),
    });

    const fullURL = `${baseURL}?${queryParams.toString()}`;
    return fullURL;
  }
  private generateRedirectURL(query: string) {
    const baseURL = 'https://app.datadoghq.com/logs';
    const queryParams = new URLSearchParams({
      query,
      cols: 'host,service',
      index: '*',
      messageDisplay: 'inline',
      stream_sort: 'time,desc',
      viz: 'stream',
      from_ts: this.beginTimestamp.toString(),
      to_ts: this.endTimestamp.toString(),
      live: 'false',
    });

    const fullURL = `${baseURL}?${queryParams.toString()}`;
    return fullURL;
  }

  private openURLInNewTab(fullURL: string) {
    window.open(fullURL, '_blank');
  }

  private generateTimestamps() {
    const today = new Date();
    const beginTimestamp = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0, // Midnight (00:00:00)
      0,
      0,
      0
    );

    const endTimestamp = new Date(); // Set to the current time

    // Adjust for the time zone offset
    const localBeginTimestamp = new Date(
      beginTimestamp.getTime() - beginTimestamp.getTimezoneOffset() * 60000
    );
    const localEndTimestamp = new Date(
      endTimestamp.getTime() - endTimestamp.getTimezoneOffset() * 60000
    );

    return {
      beginTimestamp: localBeginTimestamp,
      endTimestamp: localEndTimestamp,
    };
  }

  private setTimestampsFromTraceId(traceId: string) {
    // Use a regular expression to find the date pattern within the string
    const dateMatch = traceId.match(/(\d{2})(\d{2})(\d{2})/);

    if (dateMatch) {
      const year = parseInt(dateMatch[1], 10) + 2000;
      const month = parseInt(dateMatch[2], 10);
      const day = parseInt(dateMatch[3], 10);

      // Create beginTimestamp for 12:00 AM on the specified date (local time zone)
      const beginTimestamp = new Date(year, month - 1, day, 0, 0, 0, 0);

      // Get the current date in local time zone
      const currentDate = new Date();

      // Create endTimestamp
      let endTimestamp: Date;

      if (
        currentDate.getFullYear() === year &&
        currentDate.getMonth() === month - 1 &&
        currentDate.getDate() === day
      ) {
        // The date in traceId is today, set endTimestamp to the current time
        endTimestamp = currentDate;
      } else {
        // The date in traceId is not today, set endTimestamp to 11:59 PM
        endTimestamp = new Date(year, month - 1, day, 23, 59, 59, 999);
      }

      // Return the Unix timestamps in milliseconds
      return {
        beginTimestamp: beginTimestamp.getTime(),
        endTimestamp: endTimestamp.getTime(),
      };
    } else {
      // Handle the case when the date pattern is not found
      return null;
    }
  }

  private setAdditionalParams() {
    // Get the input value
    const inputAdditionalParamsElement = this.getInputElement(
      'inputAdditionalParams'
    ) as HTMLInputElement;
    const inputAdditionalParams = inputAdditionalParamsElement.value;

    // Split the input value into individual terms
    const terms = inputAdditionalParams.split(' ');

    // Create an array to store the formatted terms
    const formattedTerms = [];

    // Create a flag to track whether we're within double quotes
    let withinQuotes = false;
    let currentTerm = '';

    for (const term of terms) {
      if (term.startsWith('"')) {
        // If the term starts with a double quote, mark it as within quotes
        withinQuotes = true;
        currentTerm = term;
      } else if (term.endsWith('"')) {
        // If the term ends with a double quote, mark it as outside quotes
        withinQuotes = false;
        currentTerm += ' ' + term;
        // Add the term to the formattedTerms array without asterisks
        formattedTerms.push(currentTerm);
      } else if (withinQuotes) {
        // If we're within quotes, add the term without asterisks
        currentTerm += ' ' + term;
      } else {
        // If not within quotes, format the term with asterisks and add to the array
        formattedTerms.push(`*${term}*`);
      }
    }

    // Join the formatted terms with ' OR ' and set it to AdditionalParams
    this.additionalParams = formattedTerms.join(' OR ');
  }
}
