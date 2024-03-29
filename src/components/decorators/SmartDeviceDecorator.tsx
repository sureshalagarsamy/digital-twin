import { QueryRowFormat } from "@itwin/core-common";
import {
    DecorateContext,
    Decorator,
    IModelConnection,
    Marker,
    ScreenViewport,
} from "@itwin/core-frontend";
import { SmartDeviceMarker } from "../markers/SmartDeviceMarker";
import { SmartDeviceAPI } from "../../SmartDeviceAPI";
import { UiFramework } from "@itwin/appui-react";

export class SmartDeviceDecorator implements Decorator {
    private _iModel: IModelConnection;
    private _markerSet: Marker[];

    constructor(vp: ScreenViewport) {
        this._iModel = vp.iModel;
        this._markerSet = [];

        this.addMarkers();
    }

    public static async getSmartDeviceData() {
        const query = `
      SELECT SmartDeviceId,
              SmartDeviceType,
              ECInstanceId,
              Origin
              FROM DgnCustomItemTypes_HouseSchema.SmartDevice
              WHERE Origin IS NOT NULL
    `;

        const results = UiFramework.getIModelConnection()!.query(
            query,
            undefined,
            { rowFormat: QueryRowFormat.UseJsPropertyNames }
        );
        const values = [];

        for await (const row of results) values.push(row);

        return values;
    }

    private async addMarkers() {
        const values = await SmartDeviceDecorator.getSmartDeviceData();
        const cloudData = await SmartDeviceAPI.getData();
        console.log(values);

        values.forEach((value) => {
            const smartDeviceMarker = new SmartDeviceMarker(
                { x: value.origin.x, y: value.origin.y, z: value.origin.z },
                { x: 20, y: 20 },
                value.smartDeviceId,
                value.smartDeviceType,
                cloudData[value.smartDeviceId],
                value.id
            );

            this._markerSet.push(smartDeviceMarker);
        });
    }

    public decorate(context: DecorateContext): void {
        this._markerSet.forEach((marker: any) => {
            console.log(marker);
            if (marker._smartDeviceId === "light006") {
                console.log(marker._smartDeviceId);
                marker._smartDeviceType = "Light_on";
                marker.addDecoration(context);
                setTimeout(() => {
                    marker.setImageUrl("Bed.png");
                }, 5000);
            }
            marker.addDecoration(context);
        });
    }
}
