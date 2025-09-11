import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  servProvCode: string = '';
  host: string = '';
  environment: string = '';
  selectedTimeframe: string = 'TODAY';
  beginTimestamp: Number = 0;
  endTimestamp: Number = 0;
  activeBeginCalendarValue: string = '';
  activeEndCalendarValue: string = '';
  applicationsUsed: string[] = [];
  additionalServices: string[] = []; // Add this line
  traceId: string = '';
  additionalParams: string = '';
  readmeHidden: boolean = true; // Initially, README is hidden
  availableEnvironments: string[] = [];

  ngOnInit() {
    const { beginTimestamp, endTimestamp } = this.generateTimestamps();

    // Prepopulate the form elements with the generated timestamps
    this.activeBeginCalendarValue = beginTimestamp.toISOString().slice(0, 16);
    this.activeEndCalendarValue = endTimestamp.toISOString().slice(0, 16);
    this.readmeHidden = true;
  }

  toggleReadme() {
    this.readmeHidden = !this.readmeHidden;
    console.log("clicked");
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

        const datadogQuery = this.buildTraceIdDatadogQuery(this.traceId);

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

      // Check if the query generation failed due to validation error
      if (datadogQuery === '') {
        return; // Stop execution if validation failed
      }

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

  onHostChange() {
    const hostElement = this.getInputElement('inputHost') as HTMLSelectElement;
    this.host = hostElement.value;
    
    // Reset environment when host changes
    const environmentElement = this.getInputElement('inputEnvironment') as HTMLSelectElement;
    environmentElement.value = '--SELECT--';
    this.environment = '';

    // Update available environments based on host selection
    switch (this.host) {
      case 'US':
        this.availableEnvironments = ['PROD', 'SUPP', 'TEST', 'STG', 'NONPROD1', 'NONPROD2', 'NONPROD3', 'NONPROD4', 'CVCN'];
        break;
      case 'AU':
        this.availableEnvironments = ['PROD', 'SUPP', 'TEST', 'STG', 'NONPROD1', 'NONPROD2', 'NONPROD3', 'NONPROD4', 'CONV'];
        break;
      case 'CA':
        this.availableEnvironments = ['PROD', 'STG', 'NONPROD1', 'NONPROD2', 'NONPROD3', 'NONPROD4'];
        break;
      case 'OREGON':
        this.availableEnvironments = ['PROD', 'TRAIN', 'DEV', 'CONFIG', 'STG'];
        break;
      default:
        this.availableEnvironments = [];
        break;
    }
  }

  private validateForm(): boolean {
    const servProvCodeElement = this.getInputElement(
      'inputServProvCode'
    ) as HTMLInputElement;
    const hostElement = this.getInputElement(
      'inputHost'
    ) as HTMLSelectElement;
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
      hostElement.value.trim() === '' ||
      hostElement.value.trim() === '--SELECT--'
    )
      missingFields.push('Host');
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
    this.host = (
      this.getInputElement('inputHost') as HTMLSelectElement
    )?.value;
    this.environment = (
      this.getInputElement('inputEnvironment') as HTMLSelectElement
    )?.value;
    this.beginTimestamp = beginTimestamp;
    this.endTimestamp = endTimestamp;
    this.applicationsUsed = this.getCheckedApplications();
    this.additionalServices = this.getCheckedAdditionalServices(); // Add this line

    console.log('ServProvCode:', this.servProvCode);
    console.log('Host:', this.host);
    console.log('Environment:', this.environment);
    console.log('Begin Timestamp:', this.beginTimestamp);
    console.log('End Timestamp:', this.endTimestamp);
    console.log('Applications Used:', this.applicationsUsed);
    console.log('Additional Services:', this.additionalServices); // Add this line
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

  // Add this method to get checked additional services
  private getCheckedAdditionalServices(): string[] {
    const checkboxes = document.getElementsByName(
      'additionalServices[]'
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
    const upperServProvCode = servProvCode.toUpperCase();
    const lowerServProvCode = servProvCode.toLowerCase();
    const originalUpperEnv = environment.toUpperCase(); // Keep original for host filter
    let upperEnv = environment.toUpperCase();
    
    // Dynamic environment mapping based on host
    let lowerEnv = environment.toLowerCase();
    if (this.host === 'AU') {
      switch (originalUpperEnv) {
        case 'PROD':
          lowerEnv = 'auprod';
          upperEnv = 'AUPROD';
          break;
        case 'SUPP':
          lowerEnv = 'ausupp';
          upperEnv = 'AUSUPP';
          break;
        case 'TEST':
          lowerEnv = 'autest';
          upperEnv = 'AUTEST';
          break;
        case 'CONV':
          lowerEnv = 'auconv';
          upperEnv = 'AUCONV';
          break;
        case 'STG':
          lowerEnv = 'austg';
          upperEnv = 'AUSTG';
          break;
        case 'NONPROD1':
          lowerEnv = 'nonprod1';
          upperEnv = 'NONPROD1';
          break;
        case 'NONPROD2':
          lowerEnv = 'nonprod2';
          upperEnv = 'NONPROD2';
          break;
        case 'NONPROD3':
          lowerEnv = 'nonprod3';
          upperEnv = 'NONPROD3';
          break;
        case 'NONPROD4':
          lowerEnv = 'nonprod4';
          upperEnv = 'NONPROD4';
          break;
        default:
          lowerEnv = environment.toLowerCase();
          upperEnv = environment.toUpperCase();
          break;
      }
    } else if (this.host === 'CA') {
      switch (originalUpperEnv) {
        case 'PROD':
          lowerEnv = 'prodca';
          upperEnv = 'PRODCA';
          break;
        case 'STG':
          lowerEnv = 'stgca';
          upperEnv = 'STGCA';
          break;
        case 'NONPROD1':
          lowerEnv = 'nonprod1';
          upperEnv = 'NONPROD1';
          break;
        case 'NONPROD2':
          lowerEnv = 'nonprod2';
          upperEnv = 'NONPROD2';
          break;
        case 'NONPROD3':
          lowerEnv = 'nonprod3';
          upperEnv = 'NONPROD3';
          break;
        case 'NONPROD4':
          lowerEnv = 'nonprod4';
          upperEnv = 'NONPROD4';
          break;
        default:
          lowerEnv = environment.toLowerCase();
          upperEnv = environment.toUpperCase();
          break;
      }
    }
    // For US and OREGON, keep the original lowercase mapping

    let mainParts: string[] = [];
    
    // If only ACA is selected, also include Civic Platform since ACA is frontend and Civic Platform is backend
    const includesCivicPlatform = applicationsUsed.includes('Civic Platform') || applicationsUsed.includes('Citizen Access');
    const includesCitizenAccess = applicationsUsed.includes('Citizen Access');
    
    if (includesCivicPlatform) {
      mainParts.push(`@SERV_PROV_CODE:*${upperServProvCode}*`);
      
      // Skip JNDI parameters for OREGON
      if (this.host !== 'OREGON') {
        mainParts.push(`@JNDI:*${lowerServProvCode}-${lowerEnv}*`);
        mainParts.push(`@JNDI:*${upperServProvCode}-${upperEnv}*`);
      }
    }
    if (includesCitizenAccess) {
      if (this.host === 'OREGON') {
        switch (originalUpperEnv) {
          case 'PROD':
            mainParts.push(`(*${upperServProvCode}* AND service:*aca*) OR filename:*${lowerServProvCode}-orprd-aca*`);
            break;
          case 'TRAIN':
            mainParts.push(`(*${upperServProvCode}* AND service:*aca*) OR filename:*oregon-oregon-train-aca*`);
            break;
          case 'CONFIG':
            // Omit ACA query for CONFIG - logs don't show up for now
            break;
          case 'DEV':
            // Omit ACA query for DEV - logs don't show up for now
            break;
          case 'STG':
            mainParts.push(`(*${upperServProvCode}* AND service:*aca*) OR filename:*${lowerServProvCode}-${lowerEnv}*`);
            break;
          default:
            mainParts.push(`(*${upperServProvCode}* AND service:*aca*) OR filename:*${lowerServProvCode}-${lowerEnv}*`);
            break;
        }
      } else {
        mainParts.push(`(*${upperServProvCode}* AND service:*aca*) OR filename:*${lowerServProvCode}-${lowerEnv}*`);
      }
    }

    // Host filter for environment - use originalUpperEnv here
    let hostFilter = '';
    if (this.host === 'US') {
      switch (originalUpperEnv) {
        case 'PROD':
          hostFilter = 'host:*mtprd*';
          break;
        case 'TEST':
        case 'SUPP':
        case 'NONPROD1':
        case 'NONPROD2':
        case 'NONPROD3':
        case 'NONPROD4':
          hostFilter = 'host:*mtsup*';
          break;
        case 'STG':
          hostFilter = 'host:*stg*';
          break;
        case 'CVCN':
          hostFilter = 'host:*cvcn*';
          break;
      }
    } else if (this.host === 'AU') {
      switch (originalUpperEnv) {
        case 'PROD':
          hostFilter = 'host:*auprd*';
          break;
        case 'TEST':
        case 'SUPP':
        case 'NONPROD1':
        case 'NONPROD2':
        case 'NONPROD3':
        case 'NONPROD4':
          hostFilter = 'host:*ausup*';
          break;
        case 'STG':
          hostFilter = 'host:*austg*';
          break;
        case 'CONV':
          hostFilter = 'host:*auconv*';
          break;
      }
    } else if (this.host === 'CA') {
      switch (originalUpperEnv) {
        case 'PROD':
          hostFilter = 'host:*caprd*';
          break;
        case 'NONPROD1':
        case 'NONPROD2':
        case 'NONPROD3':
        case 'NONPROD4':
          hostFilter = 'host:*casup*';
          break;
        case 'STG':
          hostFilter = 'host:*castg*';
          break;
      }
    } else if (this.host === 'OREGON') {
      switch (originalUpperEnv) {
        case 'PROD':
          hostFilter = 'host:*orprd*';
          break;
        case 'TRAIN':
          hostFilter = 'host:*ortest*';
          break;
        case 'DEV':
          hostFilter = 'host:*ordev*';
          break;
        case 'CONFIG':
          hostFilter = 'host:*orconf*';
          break;
        case 'STG':
          hostFilter = 'host:*orstg*';
          break;
      }
    }

    let mainQuery = '';
    if (mainParts.length === 1) {
      // Only one main part (e.g., only ACA)
      mainQuery = `(${mainParts[0]}) AND (${hostFilter})`;
    } else if (mainParts.length > 1) {
      // Multiple main parts, join with OR and wrap in parentheses
      mainQuery = `((${mainParts.join(' OR ')}) AND (${hostFilter}))`;
    }

    // CAPI query
    let capiQuery = '';
    if (applicationsUsed.includes('CAPI')) {
      capiQuery = `(service:capi AND @Properties.log.EnvName:${originalUpperEnv} AND @Properties.log.Agency:*${upperServProvCode}*)`;
    }

    // Additional Services query - enforce single selection per category
    let additionalServicesQuery = '';
    const additionalServices = this.getCheckedAdditionalServices();
    
    if (additionalServices.length > 0) {
      const serviceConditions: string[] = [];
      
      // Check for payment services (only one allowed)
      const paymentServices = additionalServices.filter(service => 
        service === 'Forte' || service === 'Paypal Commerce'
      );
      if (paymentServices.length > 1) {
        alert('Please select only one payment service (Forte or Paypal Commerce)');
        return '';
      }
      
      // Check for document services (only one allowed)
      const documentServices = additionalServices.filter(service => 
        service === 'ACDS' || service === 'ADS'
      );
      if (documentServices.length > 1) {
        alert('Please select only one document service (ACDS or ADS)');
        return '';
      }
      
      // Process selected services
      additionalServices.forEach(service => {
        switch (service) {
          case 'Forte':
            serviceConditions.push('service:payment-adapter-service', 'name:event-log-service', 'service:config-store-service');
            break;
          case 'Paypal Commerce':
            serviceConditions.push('service:payment-adapter-service', 'name:event-log-service', 'service:config-store-service', 'service:"Paypal UI"');
            break;
          case 'ACDS':
            serviceConditions.push('service:acds', 'service:edms-handler');
            break;
          case 'ADS':
            serviceConditions.push('service:av.ads');
            break;
        }
      });
      
      // Remove duplicates and join with OR
      const uniqueConditions = [...new Set(serviceConditions)];
      if (uniqueConditions.length > 0) {
        additionalServicesQuery = `(${uniqueConditions.join(' OR ')})`;
      }
    }

    // Combine all queries
    let query = '';
    const queryParts = [mainQuery, capiQuery, additionalServicesQuery].filter(part => part !== '');
    
    if (queryParts.length > 1) {
      query = `(${queryParts.join(' OR ')})`;
    } else if (queryParts.length === 1) {
      query = queryParts[0];
    } else {
      query = '*';
    }

    // Add additional params if present
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
  // Remove known prefixes (e.g., "aca-", "W-", etc.)
  // Find the first occurrence of a date pattern: either YYYYMMDD or YYMMDD
  // Accepts: 
  //   aca-250604134315118-181f5a23-965fbe1b
  //   250604134315118-181f5a23-965fbe1b
  //   W-20250604124240646-4f3b5f17
  //   20250604124240646-4f3b5f17

  // Regex to find either 8 digits (YYYYMMDD) or 6 digits (YYMMDD) at the start or after a dash
  const match = traceId.match(/(?:^|[-_])((?:20\d{6})|(?:\d{6}))/);

  if (!match || !match[1]) {
    // Could not find a valid date pattern
    return null;
  }

  const dateStr = match[1];
  let year: number, month: number, day: number;

  if (dateStr.length === 8) {
    // Format: YYYYMMDD
    year = parseInt(dateStr.substring(0, 4), 10);
    month = parseInt(dateStr.substring(4, 6), 10);
    day = parseInt(dateStr.substring(6, 8), 10);
  } else if (dateStr.length === 6) {
    // Format: YYMMDD, assume 2000+
    year = 2000 + parseInt(dateStr.substring(0, 2), 10);
    month = parseInt(dateStr.substring(2, 4), 10);
    day = parseInt(dateStr.substring(4, 6), 10);
  } else {
    // Invalid format
    return null;
  }

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

  private buildTraceIdDatadogQuery(traceId: string): string {
    // Always include the basic search
    let query = `*${traceId}* OR @TRACE_ID:*${traceId}*`;

    // Check if the traceId has a prefix (e.g., "aca-", "W-", etc.)
    // Prefix is defined as any non-digit characters followed by a dash at the start
    const hasPrefix = /^[^\d]+-/.test(traceId);

    // If no prefix, also add @Properties.log.TraceId
    if (!hasPrefix) {
      query += ` OR @Properties.log.TraceId:${traceId}`;
    }

    return query;
  }
}
