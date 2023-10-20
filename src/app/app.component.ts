import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  servProvCode: string = '';
  environment: string = '';
  beginTimestamp: Number = 0;
  endTimestamp: Number = 0;
  applicationsUsed: string[] = [];

  constructor(private dialog: MatDialog) {}

  ngOnInit() {
    // This code will run when the component is initialized.
    const beginTimestampElement = this.getInputElement('inputBeginTimestamp') as HTMLInputElement;
    const endTimestampElement = this.getInputElement('inputEndTimestamp') as HTMLInputElement;

    const { beginTimestamp, endTimestamp } = this.generateTimestamps();

    // Prepopulate the form elements with the generated timestamps
    beginTimestampElement.value = beginTimestamp.toISOString().slice(0, 16);
    endTimestampElement.value = endTimestamp.toISOString().slice(0, 16);
  }

  onSubmit(event: Event) {
    event.preventDefault();

    // Get form elements
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

    console.log(beginTimestampElement.value,endTimestampElement.value)

    // Check for missing fields
    const missingFields: string[] = [];
    if (servProvCodeElement.value.trim() === '')
      missingFields.push('ServProvCode');
    if (environmentElement.value.trim() === '' || environmentElement.value.trim() === "--SELECT--")
      missingFields.push('Environment');
    if (beginTimestampElement.value.trim() === '')
      missingFields.push('Begin Timestamp');
    if (endTimestampElement.value.trim() === '')
      missingFields.push('End Timestamp');

    if (missingFields.length > 0) {
      alert('Please fill in the following fields: ' + missingFields.join(', '));
      return;
    }
    const applicationsUsed = this.getCheckedApplications();

    if (applicationsUsed.length === 0) {
      alert('Please select at least one application.');
      return;
    }

    const [beginUnixTimestamp, endUnixTimestamp] = this.convertToUnixTimestamps(
      beginTimestampElement.value,
      endTimestampElement.value
    );

    if (endUnixTimestamp - beginUnixTimestamp < 60000) {
      alert(
        'End timestamp must be at least 1 minute after the begin timestamp.'
      );
      return;
    }

    const currentUnixTimestamp = new Date().getTime();
    if (
      beginUnixTimestamp > currentUnixTimestamp ||
      endUnixTimestamp > currentUnixTimestamp
    ) {
      alert('Timestamps cannot be in the future.');
      return;
    }

    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    if (new Date(beginUnixTimestamp) < fifteenDaysAgo) {
      this.showConfirmationDialog().subscribe((result) => {
        if (result) {
          this.continueWithSubmission(
            servProvCodeElement,
            environmentElement,
            beginUnixTimestamp,
            endUnixTimestamp
          );
        } else {
          // User canceled, do nothing or provide an alternative action
        }
      });
    } else {
      this.continueWithSubmission(
        servProvCodeElement,
        environmentElement,
        beginUnixTimestamp,
        endUnixTimestamp
      );
    }

    const datadogURL = this.generateDatadogURL(
      this.servProvCode,
      this.environment,
      this.beginTimestamp,
      this.endTimestamp,
      this.applicationsUsed
    );
    console.log(datadogURL); // Output the generated URL
    this.openURLInNewTab(datadogURL);

  }

  private getInputElement(id: string): HTMLElement | null {
    return document.getElementById(id);
  }

  private continueWithSubmission(
    servProvCodeElement: HTMLInputElement,
    environmentElement: HTMLSelectElement,
    beginUnixTimestamp: number,
    endUnixTimestamp: number
  ) {
    this.servProvCode = servProvCodeElement.value;
    this.environment = environmentElement.value;
    this.beginTimestamp = beginUnixTimestamp;
    this.endTimestamp = endUnixTimestamp;
    this.applicationsUsed = this.getCheckedApplications();

    console.log('ServProvCode:', this.servProvCode);
    console.log('Environment:', this.environment);
    console.log('Begin Timestamp:', this.beginTimestamp);
    console.log('End Timestamp:', this.endTimestamp);
    console.log('Applications Used:', this.applicationsUsed);
  }

  private getCheckedApplications(): string[] {
    const checkboxes = document.getElementsByName(
      'applicationsUsed[]'
    ) as NodeListOf<HTMLInputElement>;
    return Array.from(checkboxes)
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);
  }

  private showConfirmationDialog() {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        message:
          'You have selected a timestamp from more than 15 days ago. You will be redirected but you will not see any results, and will need to rehydrate. Do you wish to proceed?',
      },
    });

    return dialogRef.afterClosed();
  }

  private convertToUnixTimestamps(beginTimestamp: string, endTimestamp: string): [number, number] {
    // Parse the timestamp strings into Date objects
    const beginDate = new Date(beginTimestamp);
    const endDate = new Date(endTimestamp);

    // Convert the Date objects to Unix timestamps in milliseconds
    const beginUnixTimestamp = beginDate.getTime();
    const endUnixTimestamp = endDate.getTime();

    return [beginUnixTimestamp, endUnixTimestamp];
}

  private generateDatadogURL(
    servProvCode: string,
    environment: string,
    beginTimestamp: Number,
    endTimestamp: Number,
    applicationsUsed: string[]
  ) {
    // Format the Datadog query
    let query = `(*${servProvCode.toUpperCase()}*`;

    if (applicationsUsed.includes('Civic Platform')) {
      query += ` OR @SERV_PROV_CODE:*${servProvCode.toUpperCase()}* OR @JNDI:*${servProvCode.toLowerCase()}-${environment.toLowerCase()}* OR @JNDI:*${servProvCode.toUpperCase()}-${environment.toUpperCase()}*`;
    }

    if (applicationsUsed.includes('Citizen Access')) {
      query += ` OR @filename:*${servProvCode.toLowerCase()}-${environment.toLowerCase()}*`;
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
      if (applicationsUsed.includes('Citizen Access') && !applicationsUsed.includes('Civic Platform')) {
        query += ' AND service:aca';
      }
      if (applicationsUsed.includes('Civic Platform') && !applicationsUsed.includes('Citizen Access')){
        query += ' AND -service:aca'
      }
      query += ` OR (service:capi AND @Properties.log.EnvName:${this.environment.toUpperCase()} AND @Properties.log.Agency:${this.servProvCode.toUpperCase()}))`;
    } else {
      // Add environment-specific conditions
      switch (environment) {
        case 'PROD':
          query += ' host:*mtprd*';
          break;
        case 'TEST':
        case 'SUPP':
        case 'NONPROD1':
        case 'NONPROD2':
        case 'NONPROD3':
        case 'NONPROD4':
          query += ' host:*mtsup*';
          break;
        case 'STG':
          query += ' host:*stg*';
          break;
        case 'CVCN':
          query += ' host:*cvcn*';
          break;
      }
      if (applicationsUsed.includes('Citizen Access') && !applicationsUsed.includes('Civic Platform')) {
        query += ' AND service:aca';
      }
      if (applicationsUsed.includes('Civic Platform') && !applicationsUsed.includes('Citizen Access')){
        query += ' AND -service:aca'
      }
      query += ')';

      if (applicationsUsed.includes('CAPI')  && !applicationsUsed.includes('Civic Platform') && !applicationsUsed.includes('Civic Platform')) {
        query = `service:capi AND @Properties.log.EnvName:${this.environment.toUpperCase()} AND @Properties.log.Agency:${this.servProvCode.toUpperCase()}`;
      }
    }
    // Construct the URL
    const baseURL = 'https://app.datadoghq.com/logs';
    const queryParams = new URLSearchParams({
      query,
      cols: 'host,service',
      index: '*',
      messageDisplay: 'inline',
      stream_sort: 'time,desc',
      viz: 'stream',
      from_ts: beginTimestamp.toString(),
      to_ts: endTimestamp.toString(),
      live: 'false',
    });

    const fullURL = `${baseURL}?${queryParams.toString()}`;
    return fullURL;
  }
  
  openURLInNewTab(fullURL: string) {
    window.open(fullURL, '_blank');
  }

  generateTimestamps() {
    const today = new Date();
    
    // Set the time zone to UTC for the beginTimestamp
    const beginTimestamp = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
    
    // The default "endTimestamp" is the current local time
    const endTimestamp = new Date();

    // Adjust the endTimestamp to the correct local time zone
    const localEndTimestamp = new Date(endTimestamp);
    localEndTimestamp.setMinutes(endTimestamp.getMinutes() - endTimestamp.getTimezoneOffset());

    return { beginTimestamp, endTimestamp: localEndTimestamp };
  }
}
