/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import "./App.scss";

import { BrowserAuthorizationClient } from "@itwin/browser-authorization";
import type { IModelConnection, ScreenViewport } from "@itwin/core-frontend";
import { FitViewTool, IModelApp, StandardViewId } from "@itwin/core-frontend";
import { FillCentered } from "@itwin/core-react";
import { ProgressLinear } from "@itwin/itwinui-react";
import { useAccessToken, Viewer } from "@itwin/web-viewer-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Visualization } from "./Visualization";
import { DisplayStyleSettingsProps } from "@itwin/core-common";
import { SmartDeviceDecorator } from "./components/decorators/SmartDeviceDecorator";
import { SmartDeviceUiItemsProvider } from "./providers/SmartDeviceUiItemsProvider";

import { history } from "./history";

const App: React.FC = () => {
    const [iModelId, setIModelId] = useState(process.env.IMJS_IMODEL_ID);
    const [iTwinId, setITwinId] = useState(process.env.IMJS_ITWIN_ID);

    const accessToken = useAccessToken();

    const authClient = useMemo(
        () =>
            new BrowserAuthorizationClient({
                scope: process.env.IMJS_AUTH_CLIENT_SCOPES ?? "",
                clientId: process.env.IMJS_AUTH_CLIENT_CLIENT_ID ?? "",
                redirectUri: process.env.IMJS_AUTH_CLIENT_REDIRECT_URI ?? "",
                postSignoutRedirectUri: process.env.IMJS_AUTH_CLIENT_LOGOUT_URI,
                responseType: "code",
                authority: process.env.IMJS_AUTH_AUTHORITY,
            }),
        []
    );

    const login = useCallback(async () => {
        try {
            await authClient.signInSilent();
        } catch {
            await authClient.signIn();
        }
    }, [authClient]);

    useEffect(() => {
        void login();
    }, [login]);

    useEffect(() => {
        if (accessToken) {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has("iTwinId")) {
                setITwinId(urlParams.get("iTwinId") as string);
            } else {
                if (!process.env.IMJS_ITWIN_ID) {
                    throw new Error(
                        "Please add a valid iTwin ID in the .env file and restart the application or add it to the iTwinId query parameter in the url and refresh the page. See the README for more information."
                    );
                }
            }

            if (urlParams.has("iModelId")) {
                setIModelId(urlParams.get("iModelId") as string);
            } else {
                if (!process.env.IMJS_IMODEL_ID) {
                    throw new Error(
                        "Please add a valid iModel ID in the .env file and restart the application or add it to the iModelId query parameter in the url and refresh the page. See the README for more information."
                    );
                }
            }
        }
    }, [accessToken]);

    useEffect(() => {
        if (accessToken && iTwinId && iModelId) {
            history.push(`?iTwinId=${iTwinId}&iModelId=${iModelId}`);
        }
    }, [accessToken, iTwinId, iModelId]);

    /** NOTE: This function will execute the "Fit View" tool after the iModel is loaded into the Viewer.
     * This will provide an "optimal" view of the model. However, it will override any default views that are
     * stored in the iModel. Delete this function and the prop that it is passed to if you prefer
     * to honor default views when they are present instead (the Viewer will still apply a similar function to iModels that do not have a default view).
     */
    const viewConfiguration = useCallback((viewPort: ScreenViewport) => {
        // default execute the fitview tool and use the iso standard view after tile trees are loaded
        const tileTreesLoaded = () => {
            return new Promise((resolve, reject) => {
                const start = new Date();
                const intvl = setInterval(() => {
                    if (viewPort.areAllTileTreesLoaded) {
                        clearInterval(intvl);
                        resolve(true);
                    }
                    const now = new Date();
                    // after 20 seconds, stop waiting and fit the view
                    if (now.getTime() - start.getTime() > 20000) {
                        reject();
                    }
                }, 100);
            });
        };

        tileTreesLoaded().finally(() => {
            void IModelApp.tools.run(FitViewTool.toolId, viewPort, true, false);
            viewPort.view.setStandardRotation(StandardViewId.Iso);
        });
    }, []);

    const viewCreatorOptions = useMemo(
        () => ({ viewportConfigurer: viewConfiguration }),
        [viewConfiguration]
    );

    const onIModelConnected = (_imodel: IModelConnection) => {
        IModelApp.viewManager.onViewOpen.addOnce(async (vp: ScreenViewport) => {
            const viewStyle: DisplayStyleSettingsProps = {
                viewflags: {
                    visEdges: false,
                    shadows: false,
                },
            };
            vp.overrideDisplayStyle(viewStyle);

            Visualization.hideHouseExterior(vp);

            IModelApp.viewManager.addDecorator(new SmartDeviceDecorator(vp));
        });
    };

    useEffect(() => {
        const sse = new EventSource("http://localhost:8081/notes");
        function getRealtimeData(data: any) {
            console.log(data);
        }
        sse.onmessage = (e) => getRealtimeData(JSON.parse(e.data));
        sse.onerror = () => {
            // error log here

            sse.close();
        };
        return () => {
            sse.close();
        };
    }, []);

    return (
        <div className="viewer-container">
            {!accessToken && (
                <FillCentered>
                    <div className="signin-content">
                        <ProgressLinear
                            indeterminate={true}
                            labels={["Signing in..."]}
                        />
                    </div>
                </FillCentered>
            )}
            <Viewer
                iTwinId={iTwinId}
                iModelId={iModelId}
                authClient={authClient}
                viewCreatorOptions={viewCreatorOptions}
                enablePerformanceMonitors={true} // see description in the README (https://www.npmjs.com/package/@itwin/desktop-viewer-react)
                onIModelConnected={onIModelConnected}
                uiProviders={[new SmartDeviceUiItemsProvider()]}
            />
        </div>
    );
};

export default App;
