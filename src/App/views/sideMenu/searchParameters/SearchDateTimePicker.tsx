import { DateTimePicker } from '@material-ui/pickers';
import { DateTime } from 'luxon';

const SearchDateTimePicker = ({
    minDateTime,
    maxDateTime,
    value,
    minMessage,
    maxMessage,
    handleDateTimeChange
}: {
    minDateTime: DateTime,
    maxDateTime: DateTime,
    value: DateTime,
    minMessage: string,
    maxMessage: string,
    handleDateTimeChange: (date: DateTime) => void
}) => (
    <DateTimePicker 
        label="Start" 
        inputVariant="standard"
        variant="inline"
        style={{ width: '100%' }}
        ampm={false}
        disableFuture={true}
        format="MMM dd, yyyy - HH:mm:ss"
        strictCompareDates={true}
        minDate={minDateTime}
        minDateMessage={`${minMessage} ${minDateTime.toFormat('MMM dd, yyyy - HH:mm:ss')}`}
        maxDate={maxDateTime}
        maxDateMessage={`${maxMessage} ${maxDateTime.toFormat('MMM dd, yyyy - HH:mm:ss')}`}
        value={value} 
        onChange={(date: DateTime) => handleDateTimeChange(date)}
    />
);

export default SearchDateTimePicker